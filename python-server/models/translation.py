"""
Translation Mixin
AWS Translate and Qwen3 LLM support
"""

import time
import torch

from config.settings import Config
from utils.logger import DebugLogger


class TranslationMixin:
    """번역 관련 메서드를 제공하는 Mixin 클래스"""

    def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        """
        Translate text using AWS Translate or Qwen3

        Args:
            text: Source text to translate
            source_lang: Source language code (ko, en, ja, etc.)
            target_lang: Target language code

        Returns:
            Translated text
        """
        if not text.strip():
            return ""
        if source_lang == target_lang:
            return text

        start_time = time.time()
        DebugLogger.translation_start(text, source_lang, target_lang)

        if Config.TRANSLATION_BACKEND == "aws":
            result = self._translate_aws(text, source_lang, target_lang)
        else:
            result = self._translate_qwen(text, source_lang, target_lang)

        latency_ms = (time.time() - start_time) * 1000
        DebugLogger.translation_result(result, source_lang, target_lang, latency_ms)

        return result

    def _translate_aws(self, text: str, source_lang: str, target_lang: str) -> str:
        """
        Translate using AWS Translate

        Fast and reliable for most languages.
        Falls back to Qwen3 on error.
        """
        try:
            aws_source = Config.AWS_TRANSLATE_LANG_CODES.get(source_lang, source_lang)
            aws_target = Config.AWS_TRANSLATE_LANG_CODES.get(target_lang, target_lang)

            response = self.translate_client.translate_text(
                Text=text,
                SourceLanguageCode=aws_source,
                TargetLanguageCode=aws_target,
            )

            return response['TranslatedText']

        except Exception as e:
            DebugLogger.log("TRANS_ERROR", f"AWS Translate failed: {e}")
            return self._translate_qwen(text, source_lang, target_lang)

    def _translate_qwen(self, text: str, source_lang: str, target_lang: str) -> str:
        """
        Translate using Qwen3-8B LLM

        Local inference, useful when AWS is not available.
        """
        source_name = Config.LANGUAGE_NAMES.get(source_lang, "English")
        target_name = Config.LANGUAGE_NAMES.get(target_lang, "English")

        try:
            prompt = f"""Translate this {source_name} text to {target_name}.
Rules:
- Output ONLY the {target_name} translation
- Do NOT include the original text
- Do NOT add explanations

Text: {text}

{target_name} translation:"""

            messages = [{"role": "user", "content": prompt}]

            input_text = self.qwen_tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True,
                enable_thinking=False
            )
            inputs = self.qwen_tokenizer(
                input_text,
                return_tensors="pt",
                truncation=True,
                max_length=512
            ).to(self.qwen_model.device)

            with torch.no_grad():
                outputs = self.qwen_model.generate(
                    **inputs,
                    max_new_tokens=256,
                    do_sample=False,
                    pad_token_id=self.qwen_tokenizer.eos_token_id,
                )

            input_len = inputs["input_ids"].shape[1]
            result = self.qwen_tokenizer.decode(
                outputs[0][input_len:],
                skip_special_tokens=True
            ).strip()

            return self._clean_translation(result)

        except Exception as e:
            DebugLogger.log("TRANS_ERROR", f"Qwen translation failed: {e}")
            return ""

    def _clean_translation(self, text: str) -> str:
        """
        Clean up translation output

        Removes common prefixes and formatting issues from LLM output.
        """
        result = text.strip()

        prefixes = [
            "Here is the translation:", "Here's the translation:",
            "Translation:", "The translation is:", "Translated text:",
        ]
        for prefix in prefixes:
            if result.lower().startswith(prefix.lower()):
                result = result[len(prefix):].strip()

        lines = [line.strip() for line in result.split('\n') if line.strip()]
        if len(lines) > 1:
            if len(lines[0]) < 5 and len(lines) > 1:
                result = lines[1]
            else:
                result = lines[0]
        elif lines:
            result = lines[0]

        if (result.startswith('"') and result.endswith('"')) or \
           (result.startswith("'") and result.endswith("'")):
            result = result[1:-1]

        return result.strip()
