"""
TTS (Text-to-Speech) Mixin
Amazon Polly support with neural/standard voices
"""

import time
from typing import Tuple

from config.settings import Config
from utils.logger import DebugLogger


class TTSMixin:
    """TTS 관련 메서드를 제공하는 Mixin 클래스"""

    # Voice configuration for each language
    VOICE_CONFIG = {
        "ko": ("Seoyeon", "neural"),
        "en": ("Joanna", "neural"),
        "zh": ("Zhiyu", "neural"),
        "ja": ("Takumi", "neural"),
        "es": ("Lucia", "neural"),
        "fr": ("Lea", "neural"),
        "de": ("Vicki", "neural"),
        "pt": ("Camila", "neural"),
        "ru": ("Tatyana", "standard"),
        "ar": ("Zeina", "standard"),
        "hi": ("Aditi", "standard"),
        "tr": ("Filiz", "standard"),
    }

    def synthesize_speech(self, text: str, target_lang: str) -> Tuple[bytes, int]:
        """
        Text to Speech using Amazon Polly

        Args:
            text: Text to synthesize
            target_lang: Target language code

        Returns:
            (audio_data_bytes, duration_ms)
        """
        if not text.strip():
            return b"", 0

        start_time = time.time()
        DebugLogger.tts_start(text, target_lang)

        voice_id, engine = self.VOICE_CONFIG.get(target_lang, ("Joanna", "neural"))

        try:
            response = self.polly_client.synthesize_speech(
                Text=text,
                OutputFormat="mp3",
                VoiceId=voice_id,
                Engine=engine,
                SampleRate="24000",
            )

            audio_data = response["AudioStream"].read()
            # Estimate duration from audio size (rough estimate for MP3)
            duration_ms = int(len(audio_data) / 24 * 8)

            latency_ms = (time.time() - start_time) * 1000
            DebugLogger.tts_result(len(audio_data), duration_ms, latency_ms)

            return audio_data, duration_ms

        except Exception as e:
            DebugLogger.log("TTS_ERROR", f"Polly failed: {e}")
            return b"", 0
