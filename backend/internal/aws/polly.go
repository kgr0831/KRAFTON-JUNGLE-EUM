package aws

import (
	"context"
	"fmt"
	"io"
	"log"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/polly"
	"github.com/aws/aws-sdk-go-v2/service/polly/types"
)

// PollyService Amazon Polly TTS 서비스
type PollyService struct {
	client *polly.Client
}

// VoiceConfig 음성 설정
type VoiceConfig struct {
	VoiceID    string
	Engine     types.Engine
	SampleRate string
}

// 언어별 기본 음성 설정
var defaultVoices = map[string]VoiceConfig{
	"ko": {VoiceID: "Seoyeon", Engine: types.EngineNeural, SampleRate: "16000"},
	"en": {VoiceID: "Matthew", Engine: types.EngineNeural, SampleRate: "16000"},
	"ja": {VoiceID: "Takumi", Engine: types.EngineNeural, SampleRate: "16000"},
	"zh": {VoiceID: "Zhiyu", Engine: types.EngineNeural, SampleRate: "16000"},
	"es": {VoiceID: "Lucia", Engine: types.EngineNeural, SampleRate: "16000"},
	"fr": {VoiceID: "Lea", Engine: types.EngineNeural, SampleRate: "16000"},
	"de": {VoiceID: "Vicki", Engine: types.EngineNeural, SampleRate: "16000"},
}

// NewPollyService PollyService 생성
func NewPollyService(cfg aws.Config) *PollyService {
	client := polly.NewFromConfig(cfg)
	return &PollyService{client: client}
}

// SynthesizeSpeech 텍스트를 음성으로 변환
func (s *PollyService) SynthesizeSpeech(ctx context.Context, text, language string) ([]byte, error) {
	if text == "" {
		return nil, nil
	}

	// 언어별 음성 설정
	voiceConfig, ok := defaultVoices[language]
	if !ok {
		voiceConfig = defaultVoices["en"] // 기본값: 영어
	}

	input := &polly.SynthesizeSpeechInput{
		Text:         aws.String(text),
		VoiceId:      types.VoiceId(voiceConfig.VoiceID),
		Engine:       voiceConfig.Engine,
		OutputFormat: types.OutputFormatPcm,
		SampleRate:   aws.String(voiceConfig.SampleRate),
	}

	result, err := s.client.SynthesizeSpeech(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("polly synthesize error: %w", err)
	}
	defer result.AudioStream.Close()

	audioData, err := io.ReadAll(result.AudioStream)
	if err != nil {
		return nil, fmt.Errorf("read audio stream error: %w", err)
	}

	log.Printf("🔊 Polly TTS [%s]: %d bytes generated for text: %s", language, len(audioData), truncateText(text, 50))

	return audioData, nil
}

// SynthesizeSpeechMP3 MP3 형식으로 음성 생성
func (s *PollyService) SynthesizeSpeechMP3(ctx context.Context, text, language string) ([]byte, error) {
	if text == "" {
		return nil, nil
	}

	voiceConfig, ok := defaultVoices[language]
	if !ok {
		voiceConfig = defaultVoices["en"]
	}

	input := &polly.SynthesizeSpeechInput{
		Text:         aws.String(text),
		VoiceId:      types.VoiceId(voiceConfig.VoiceID),
		Engine:       voiceConfig.Engine,
		OutputFormat: types.OutputFormatMp3,
		SampleRate:   aws.String("22050"),
	}

	result, err := s.client.SynthesizeSpeech(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("polly synthesize mp3 error: %w", err)
	}
	defer result.AudioStream.Close()

	audioData, err := io.ReadAll(result.AudioStream)
	if err != nil {
		return nil, fmt.Errorf("read audio stream error: %w", err)
	}

	return audioData, nil
}

func truncateText(text string, maxLen int) string {
	if len(text) <= maxLen {
		return text
	}
	return text[:maxLen] + "..."
}
