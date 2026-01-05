"""
Room-based Cache Manager - STT/Translation/TTS 결과 캐싱

동일 Room 내에서 동일한 발화에 대해:
- STT 결과: 1회만 처리
- 번역 결과: 타겟 언어별 1회만 처리
- TTS 결과: 타겟 언어별 1회만 처리
"""

import time
import threading
import hashlib
from typing import Dict, Set, Tuple
from dataclasses import dataclass
from collections import defaultdict

from config.settings import Config
from utils.logger import DebugLogger


@dataclass
class CacheEntry:
    """캐시 엔트리"""
    value: any
    created_at: float
    ttl: float = Config.CACHE_TTL_SECONDS

    def is_expired(self) -> bool:
        return time.time() - self.created_at > self.ttl


class RoomCacheManager:
    """
    Room 기반 캐시 매니저 (싱글톤)

    동일 Room 내에서 동일한 발화에 대해 결과를 캐싱하여
    같은 언어를 원하는 여러 리스너가 동일한 결과를 공유
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def initialize(self):
        if self._initialized:
            return

        # room_id -> speaker_id -> cache_key -> CacheEntry
        self.stt_cache: Dict[str, Dict[str, Dict[str, CacheEntry]]] = defaultdict(lambda: defaultdict(dict))
        self.translation_cache: Dict[str, Dict[str, CacheEntry]] = defaultdict(dict)
        self.tts_cache: Dict[str, Dict[str, CacheEntry]] = defaultdict(dict)

        # 리스너 관리: room_id -> target_lang -> set of listener_ids
        self.room_listeners: Dict[str, Dict[str, Set[str]]] = defaultdict(lambda: defaultdict(set))

        # 결과 대기 큐: 동일 요청이 처리 중일 때 대기
        self.pending_requests: Dict[str, threading.Event] = {}

        self._cache_lock = threading.Lock()
        self._initialized = True

        # 주기적 캐시 정리 스레드 시작
        self._cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
        self._cleanup_thread.start()

        DebugLogger.log("CACHE", "RoomCacheManager initialized")

    def _cleanup_loop(self):
        """주기적으로 만료된 캐시 정리"""
        while True:
            time.sleep(Config.CACHE_CLEANUP_INTERVAL)
            self._cleanup_expired()

    def _cleanup_expired(self):
        """만료된 캐시 엔트리 제거"""
        with self._cache_lock:
            cleaned = 0

            # STT 캐시 정리
            for room_id in list(self.stt_cache.keys()):
                for speaker_id in list(self.stt_cache[room_id].keys()):
                    for key in list(self.stt_cache[room_id][speaker_id].keys()):
                        if self.stt_cache[room_id][speaker_id][key].is_expired():
                            del self.stt_cache[room_id][speaker_id][key]
                            cleaned += 1

            # Translation 캐시 정리
            for key in list(self.translation_cache.keys()):
                if self.translation_cache[key].is_expired():
                    del self.translation_cache[key]
                    cleaned += 1

            # TTS 캐시 정리
            for key in list(self.tts_cache.keys()):
                if self.tts_cache[key].is_expired():
                    del self.tts_cache[key]
                    cleaned += 1

            if cleaned > 0:
                DebugLogger.log("CACHE_CLEANUP", f"Cleaned {cleaned} expired entries")

    def register_listener(self, room_id: str, listener_id: str, target_lang: str):
        """리스너 등록"""
        with self._cache_lock:
            self.room_listeners[room_id][target_lang].add(listener_id)
            DebugLogger.log("CACHE", f"Listener registered", {
                "room": room_id[:8] if room_id else "unknown",
                "listener": listener_id[:8] if listener_id else "unknown",
                "target_lang": target_lang,
                "total_listeners": len(self.room_listeners[room_id][target_lang])
            })

    def unregister_listener(self, room_id: str, listener_id: str, target_lang: str):
        """리스너 해제"""
        with self._cache_lock:
            if room_id in self.room_listeners and target_lang in self.room_listeners[room_id]:
                self.room_listeners[room_id][target_lang].discard(listener_id)

    def get_listeners_for_language(self, room_id: str, target_lang: str) -> Set[str]:
        """특정 타겟 언어의 모든 리스너 ID 반환"""
        with self._cache_lock:
            return self.room_listeners[room_id][target_lang].copy()

    def _make_audio_hash(self, audio_bytes: bytes) -> str:
        """오디오 데이터의 해시 생성 (빠른 비교용)"""
        return hashlib.md5(audio_bytes).hexdigest()[:16]

    def get_or_create_stt(self, room_id: str, speaker_id: str, audio_bytes: bytes,
                          transcribe_fn) -> Tuple[str, float, bool]:
        """
        STT 결과 캐시에서 가져오거나 새로 생성

        Returns:
            (text, confidence, was_cached)
        """
        audio_hash = self._make_audio_hash(audio_bytes)
        cache_key = f"{room_id}:{speaker_id}:{audio_hash}"

        event = None
        with self._cache_lock:
            # 캐시 확인
            if room_id in self.stt_cache and speaker_id in self.stt_cache[room_id]:
                if audio_hash in self.stt_cache[room_id][speaker_id]:
                    entry = self.stt_cache[room_id][speaker_id][audio_hash]
                    if not entry.is_expired():
                        DebugLogger.log("CACHE_HIT", "STT cache hit", {"key": cache_key[:16]})
                        return entry.value[0], entry.value[1], True

            # 처리 중인지 확인
            if cache_key in self.pending_requests:
                event = self.pending_requests[cache_key]

        # 다른 스레드가 처리 중이면 대기
        if event is not None:
            event.wait(timeout=Config.STT_TIMEOUT)
            with self._cache_lock:
                if room_id in self.stt_cache and speaker_id in self.stt_cache[room_id]:
                    if audio_hash in self.stt_cache[room_id][speaker_id]:
                        entry = self.stt_cache[room_id][speaker_id][audio_hash]
                        return entry.value[0], entry.value[1], True

        # 처리 시작 마킹
        with self._cache_lock:
            self.pending_requests[cache_key] = threading.Event()

        try:
            # 실제 STT 처리
            text, confidence = transcribe_fn(audio_bytes)

            # 결과 캐시
            with self._cache_lock:
                self.stt_cache[room_id][speaker_id][audio_hash] = CacheEntry(
                    value=(text, confidence),
                    created_at=time.time()
                )
                DebugLogger.log("CACHE_SET", "STT cached", {"key": cache_key[:16], "text_len": len(text)})

            return text, confidence, False
        finally:
            with self._cache_lock:
                if cache_key in self.pending_requests:
                    self.pending_requests[cache_key].set()
                    del self.pending_requests[cache_key]

    def get_or_create_translation(self, room_id: str, text: str, source_lang: str, target_lang: str,
                                   translate_fn) -> Tuple[str, bool]:
        """
        번역 결과 캐시에서 가져오거나 새로 생성

        Returns:
            (translated_text, was_cached)
        """
        cache_key = f"{room_id}:{source_lang}:{target_lang}:{hash(text)}"

        with self._cache_lock:
            if cache_key in self.translation_cache:
                entry = self.translation_cache[cache_key]
                if not entry.is_expired():
                    DebugLogger.log("CACHE_HIT", "Translation cache hit", {"room": room_id[:8], "key": cache_key[:24]})
                    return entry.value, True

        # 실제 번역 처리
        translated = translate_fn(text, source_lang, target_lang)

        # 결과 캐시
        with self._cache_lock:
            self.translation_cache[cache_key] = CacheEntry(
                value=translated,
                created_at=time.time()
            )
            DebugLogger.log("CACHE_SET", "Translation cached", {"room": room_id[:8], "key": cache_key[:24]})

        return translated, False

    def get_or_create_tts(self, room_id: str, text: str, target_lang: str,
                          synthesize_fn) -> Tuple[bytes, int, bool]:
        """
        TTS 결과 캐시에서 가져오거나 새로 생성

        Returns:
            (audio_bytes, duration_ms, was_cached)
        """
        cache_key = f"{room_id}:tts:{target_lang}:{hash(text)}"

        with self._cache_lock:
            if cache_key in self.tts_cache:
                entry = self.tts_cache[cache_key]
                if not entry.is_expired():
                    DebugLogger.log("CACHE_HIT", "TTS cache hit", {"room": room_id[:8], "key": cache_key[:24]})
                    return entry.value[0], entry.value[1], True

        # 실제 TTS 처리
        audio_bytes, duration_ms = synthesize_fn(text, target_lang)

        # 결과 캐시
        with self._cache_lock:
            self.tts_cache[cache_key] = CacheEntry(
                value=(audio_bytes, duration_ms),
                created_at=time.time()
            )
            DebugLogger.log("CACHE_SET", "TTS cached", {"room": room_id[:8], "key": cache_key[:24]})

        return audio_bytes, duration_ms, False
