package aws

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"

	appconfig "realtime-backend/internal/config"
)

// Service 통합 AWS 서비스
type Service struct {
	Transcribe *TranscribeService
	Translate  *TranslateService
	Polly      *PollyService
	region     string
}

// TranslationStream 실시간 번역 스트림
type TranslationStream struct {
	ctx             context.Context
	cancel          context.CancelFunc
	service         *Service
	transcribeStream *TranscribeStream
	sessionID       string
	sourceLanguage  string
	targetLanguage  string
	TranscriptChan  chan *TranslationResult
	AudioChan       chan *TTSResult
	ErrorChan       chan error
	mu              sync.Mutex
}

// TranslationResult 번역 결과
type TranslationResult struct {
	OriginalText   string
	TranslatedText string
	SourceLanguage string
	TargetLanguage string
	IsFinal        bool
}

// TTSResult TTS 결과
type TTSResult struct {
	AudioData      []byte
	TargetLanguage string
	Text           string
}

// NewService AWS 서비스 생성
func NewService(cfg *appconfig.S3Config) (*Service, error) {
	if cfg.AccessKeyID == "" || cfg.SecretAccessKey == "" {
		return nil, fmt.Errorf("AWS credentials are required")
	}

	// AWS 설정 로드
	awsCfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion(cfg.Region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			cfg.AccessKeyID,
			cfg.SecretAccessKey,
			"",
		)),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	return &Service{
		Transcribe: NewTranscribeService(awsCfg),
		Translate:  NewTranslateService(awsCfg),
		Polly:      NewPollyService(awsCfg),
		region:     cfg.Region,
	}, nil
}

// StartTranslationStream 실시간 번역 스트림 시작
func (s *Service) StartTranslationStream(ctx context.Context, sessionID, sourceLang, targetLang string, sampleRate int32) (*TranslationStream, error) {
	streamCtx, cancel := context.WithCancel(ctx)

	// Transcribe 스트림 시작
	transcribeStream, err := s.Transcribe.StartStream(streamCtx, sessionID, sourceLang, sampleRate)
	if err != nil {
		cancel()
		return nil, fmt.Errorf("start transcribe stream: %w", err)
	}

	stream := &TranslationStream{
		ctx:              streamCtx,
		cancel:           cancel,
		service:          s,
		transcribeStream: transcribeStream,
		sessionID:        sessionID,
		sourceLanguage:   sourceLang,
		targetLanguage:   targetLang,
		TranscriptChan:   make(chan *TranslationResult, 50),
		AudioChan:        make(chan *TTSResult, 50),
		ErrorChan:        make(chan error, 10),
	}

	// 번역 파이프라인 시작
	go stream.runPipeline()

	log.Printf("🚀 [%s] Translation stream started: %s -> %s", sessionID, sourceLang, targetLang)

	return stream, nil
}

// runPipeline 번역 파이프라인 실행 (STT -> Translate -> TTS)
func (s *TranslationStream) runPipeline() {
	defer close(s.TranscriptChan)
	defer close(s.AudioChan)
	defer close(s.ErrorChan)

	for {
		select {
		case <-s.ctx.Done():
			return

		case result, ok := <-s.transcribeStream.Results():
			if !ok {
				return
			}

			// STT 결과 처리
			if result.Text == "" {
				continue
			}

			// 번역 수행 (같은 언어면 스킵)
			var translatedText string
			var err error

			if s.sourceLanguage != s.targetLanguage {
				// 타임아웃 컨텍스트
				translateCtx, cancel := context.WithTimeout(s.ctx, 5*time.Second)
				translatedText, err = s.service.Translate.Translate(translateCtx, result.Text, s.sourceLanguage, s.targetLanguage)
				cancel()

				if err != nil {
					log.Printf("⚠️ [%s] Translation error: %v", s.sessionID, err)
					translatedText = result.Text // 번역 실패 시 원본 사용
				}
			} else {
				translatedText = result.Text
			}

			// 번역 결과 전송
			select {
			case s.TranscriptChan <- &TranslationResult{
				OriginalText:   result.Text,
				TranslatedText: translatedText,
				SourceLanguage: s.sourceLanguage,
				TargetLanguage: s.targetLanguage,
				IsFinal:        result.IsFinal,
			}:
				log.Printf("📤 [%s] Translation sent: %s -> %s", s.sessionID, result.Text, translatedText)
			default:
				log.Printf("⚠️ [%s] Transcript channel full", s.sessionID)
			}

			// TTS 생성 (번역된 텍스트가 있을 때만)
			if translatedText != "" && s.sourceLanguage != s.targetLanguage {
				go s.generateTTS(translatedText)
			}

		case err, ok := <-s.transcribeStream.Errors():
			if !ok {
				return
			}
			if err != nil {
				select {
				case s.ErrorChan <- err:
				default:
				}
			}
		}
	}
}

// generateTTS TTS 생성
func (s *TranslationStream) generateTTS(text string) {
	ttsCtx, cancel := context.WithTimeout(s.ctx, 10*time.Second)
	defer cancel()

	audioData, err := s.service.Polly.SynthesizeSpeech(ttsCtx, text, s.targetLanguage)
	if err != nil {
		log.Printf("⚠️ [%s] TTS error: %v", s.sessionID, err)
		return
	}

	if len(audioData) == 0 {
		return
	}

	select {
	case s.AudioChan <- &TTSResult{
		AudioData:      audioData,
		TargetLanguage: s.targetLanguage,
		Text:           text,
	}:
		log.Printf("🔊 [%s] TTS sent: %d bytes", s.sessionID, len(audioData))
	default:
		log.Printf("⚠️ [%s] Audio channel full", s.sessionID)
	}
}

// SendAudio 오디오 데이터 전송
func (s *TranslationStream) SendAudio(data []byte) error {
	return s.transcribeStream.SendAudio(data)
}

// Close 스트림 종료
func (s *TranslationStream) Close() {
	s.cancel()
	s.transcribeStream.Close()
}
