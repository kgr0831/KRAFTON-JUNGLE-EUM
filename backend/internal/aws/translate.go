package aws

import (
	"context"
	"log"
	"strings"
	"sync"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/translate"
)

// TranslateClient wraps Amazon Translate
type TranslateClient struct {
	client *translate.Client
}

// TranslationResult holds translated text
type TranslationResult struct {
	SourceText     string
	SourceLanguage string
	TargetLanguage string
	TranslatedText string
}

// Translate 언어 코드 매핑 (Amazon Translate는 ISO 639-1 사용)
// AWS Translate supports these primary codes
var translateLanguageCodes = map[string]string{
	"ko": "ko",
	"en": "en",
	"ja": "ja",
	"zh": "zh",
	// Aliases for common variations
	"ko-KR": "ko",
	"en-US": "en",
	"en-GB": "en",
	"ja-JP": "ja",
	"zh-CN": "zh",
	"zh-TW": "zh",
}

// supportedTargetLanguages is a set of valid target languages
var supportedTargetLanguages = map[string]bool{
	"ko": true,
	"en": true,
	"ja": true,
	"zh": true,
}

// normalizeLanguageCode normalizes a language code to a supported format
func normalizeLanguageCode(lang string) string {
	// First check if it's already in the map
	if code, ok := translateLanguageCodes[lang]; ok {
		return code
	}
	// Try lowercase
	if code, ok := translateLanguageCodes[strings.ToLower(lang)]; ok {
		return code
	}
	// Try just the first 2 characters
	if len(lang) >= 2 {
		short := strings.ToLower(lang[:2])
		if code, ok := translateLanguageCodes[short]; ok {
			return code
		}
	}
	return ""
}

// NewTranslateClient creates a new Translate client
func NewTranslateClient(cfg aws.Config) *TranslateClient {
	return &TranslateClient{
		client: translate.NewFromConfig(cfg),
	}
}

// Translate translates text from source to target language
func (c *TranslateClient) Translate(ctx context.Context, text, sourceLang, targetLang string) (*TranslationResult, error) {
	// Normalize language codes
	srcCode := normalizeLanguageCode(sourceLang)
	tgtCode := normalizeLanguageCode(targetLang)

	// Validate and fix invalid language codes
	if srcCode == "" {
		log.Printf("[Translate] ⚠️ Unknown source language '%s', defaulting to 'ko'", sourceLang)
		srcCode = "ko"
	}
	if tgtCode == "" {
		log.Printf("[Translate] ⚠️ Unknown target language '%s', defaulting to 'en'", targetLang)
		tgtCode = "en"
	}

	// Validate target is a supported language (prevent German, Spanish, etc.)
	if !supportedTargetLanguages[tgtCode] {
		log.Printf("[Translate] ⚠️ Unsupported target language '%s' (normalized from '%s'), defaulting to 'en'", tgtCode, targetLang)
		tgtCode = "en"
	}

	// Skip if same language
	if srcCode == tgtCode {
		return &TranslationResult{
			SourceText:     text,
			SourceLanguage: srcCode,
			TargetLanguage: tgtCode,
			TranslatedText: text,
		}, nil
	}

	// Skip empty text
	if text == "" {
		return &TranslationResult{
			SourceText:     text,
			SourceLanguage: srcCode,
			TargetLanguage: tgtCode,
			TranslatedText: text,
		}, nil
	}

	input := &translate.TranslateTextInput{
		Text:               aws.String(text),
		SourceLanguageCode: aws.String(srcCode),
		TargetLanguageCode: aws.String(tgtCode),
	}

	log.Printf("[Translate] Translating: '%s' from %s to %s", text, srcCode, tgtCode)

	output, err := c.client.TranslateText(ctx, input)
	if err != nil {
		log.Printf("[Translate] ❌ Error translating from %s to %s: %v", srcCode, tgtCode, err)
		return nil, err
	}

	result := aws.ToString(output.TranslatedText)
	log.Printf("[Translate] ✅ Result: '%s' → '%s' (%s→%s)", text, result, srcCode, tgtCode)

	return &TranslationResult{
		SourceText:     text,
		SourceLanguage: srcCode,
		TargetLanguage: tgtCode,
		TranslatedText: result,
	}, nil
}

// TranslateToMultiple translates text to multiple target languages concurrently
func (c *TranslateClient) TranslateToMultiple(ctx context.Context, text, sourceLang string, targetLangs []string) (map[string]*TranslationResult, error) {
	results := make(map[string]*TranslationResult)
	var mu sync.Mutex
	var wg sync.WaitGroup
	var firstErr error
	var errMu sync.Mutex

	for _, targetLang := range targetLangs {
		// Skip same language translation
		if targetLang == sourceLang {
			mu.Lock()
			results[targetLang] = &TranslationResult{
				SourceText:     text,
				SourceLanguage: sourceLang,
				TargetLanguage: targetLang,
				TranslatedText: text,
			}
			mu.Unlock()
			continue
		}

		wg.Add(1)
		go func(tl string) {
			defer wg.Done()

			result, err := c.Translate(ctx, text, sourceLang, tl)
			if err != nil {
				errMu.Lock()
				if firstErr == nil {
					firstErr = err
				}
				errMu.Unlock()
				return
			}

			mu.Lock()
			results[tl] = result
			mu.Unlock()
		}(targetLang)
	}

	wg.Wait()

	// Return results even if some translations failed
	if len(results) == 0 && firstErr != nil {
		return nil, firstErr
	}

	return results, nil
}
