"""
Debug Logger - Detailed timing and flow tracking
"""

import json
from datetime import datetime


class DebugLogger:
    """상세 디버깅을 위한 로거 클래스"""

    ENABLED = True  # 디버깅 활성화/비활성화
    VERBOSE = True  # 상세 로그 (오디오 바이트 등)

    @staticmethod
    def timestamp():
        return datetime.now().strftime('%H:%M:%S.%f')[:-3]

    @staticmethod
    def log(category: str, message: str, data: dict = None):
        if not DebugLogger.ENABLED:
            return

        ts = DebugLogger.timestamp()

        if data and DebugLogger.VERBOSE:
            data_str = json.dumps(data, ensure_ascii=False, default=str)
            print(f"[{ts}] [{category}] {message} | {data_str}")
        else:
            print(f"[{ts}] [{category}] {message}")

    @staticmethod
    def audio_received(session_id: str, chunk_bytes: int, duration_sec: float):
        DebugLogger.log("AUDIO_IN", f"Received audio chunk", {
            "session": session_id[:8],
            "bytes": chunk_bytes,
            "duration_sec": f"{duration_sec:.3f}",
            "bytes_per_sec": int(chunk_bytes / duration_sec) if duration_sec > 0 else 0
        })

    @staticmethod
    def vad_result(has_speech: bool, is_sentence_end: bool, buffer_duration: float):
        DebugLogger.log("VAD", f"Speech={has_speech}, SentenceEnd={is_sentence_end}", {
            "buffer_sec": f"{buffer_duration:.2f}"
        })

    @staticmethod
    def stt_start(audio_bytes: int, language: str):
        DebugLogger.log("STT_START", f"Starting transcription", {
            "bytes": audio_bytes,
            "lang": language
        })

    @staticmethod
    def stt_result(text: str, confidence: float, latency_ms: float):
        DebugLogger.log("STT_DONE", f"Transcription complete", {
            "text_len": len(text),
            "text_preview": text[:50] + "..." if len(text) > 50 else text,
            "confidence": f"{confidence:.2f}",
            "latency_ms": f"{latency_ms:.0f}"
        })

    @staticmethod
    def translation_start(text: str, source: str, target: str):
        DebugLogger.log("TRANS_START", f"Translating {source}→{target}", {
            "text_len": len(text)
        })

    @staticmethod
    def translation_result(result: str, source: str, target: str, latency_ms: float):
        DebugLogger.log("TRANS_DONE", f"Translation {source}→{target} complete", {
            "result_len": len(result),
            "result_preview": result[:50] + "..." if len(result) > 50 else result,
            "latency_ms": f"{latency_ms:.0f}"
        })

    @staticmethod
    def tts_start(text: str, language: str):
        DebugLogger.log("TTS_START", f"Synthesizing speech", {
            "text_len": len(text),
            "lang": language
        })

    @staticmethod
    def tts_result(audio_bytes: int, duration_ms: int, latency_ms: float):
        DebugLogger.log("TTS_DONE", f"TTS complete", {
            "audio_bytes": audio_bytes,
            "duration_ms": duration_ms,
            "latency_ms": f"{latency_ms:.0f}"
        })

    @staticmethod
    def pipeline_complete(total_latency_ms: float, breakdown: dict):
        DebugLogger.log("PIPELINE", f"Complete pipeline", {
            "total_latency_ms": f"{total_latency_ms:.0f}",
            **breakdown
        })
