package aws

import (
	"context"
	"fmt"
	"log"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/translate"
)

// TranslateService Amazon Translate 서비스
type TranslateService struct {
	client *translate.Client
}

// 언어 코드 매핑 (내부 코드 -> AWS Translate 코드)
var translateLangCodes = map[string]string{
	"ko": "ko",
	"en": "en",
	"ja": "ja",
	"zh": "zh",
	"es": "es",
	"fr": "fr",
	"de": "de",
}

// NewTranslateService TranslateService 생성
func NewTranslateService(cfg aws.Config) *TranslateService {
	client := translate.NewFromConfig(cfg)
	return &TranslateService{client: client}
}

// Translate 텍스트 번역
func (s *TranslateService) Translate(ctx context.Context, text, sourceLang, targetLang string) (string, error) {
	if text == "" {
		return "", nil
	}

	// 같은 언어면 번역 불필요
	if sourceLang == targetLang {
		return text, nil
	}

	// AWS 언어 코드로 변환
	awsSource := translateLangCodes[sourceLang]
	if awsSource == "" {
		awsSource = sourceLang
	}
	awsTarget := translateLangCodes[targetLang]
	if awsTarget == "" {
		awsTarget = targetLang
	}

	input := &translate.TranslateTextInput{
		Text:               aws.String(text),
		SourceLanguageCode: aws.String(awsSource),
		TargetLanguageCode: aws.String(awsTarget),
	}

	result, err := s.client.TranslateText(ctx, input)
	if err != nil {
		return "", fmt.Errorf("translate error: %w", err)
	}

	translatedText := aws.ToString(result.TranslatedText)
	log.Printf("🌐 Translated [%s->%s]: %s => %s", sourceLang, targetLang, text, translatedText)

	return translatedText, nil
}
