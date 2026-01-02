package aws

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/transcribestreaming"
	"github.com/aws/aws-sdk-go-v2/service/transcribestreaming/types"
)

// TranscribeService Amazon Transcribe Streaming 서비스
type TranscribeService struct {
	cfg aws.Config
}

// TranscriptResult STT 결과
type TranscriptResult struct {
	Text      string
	IsPartial bool
	IsFinal   bool
}

// TranscribeStream 스트리밍 세션
type TranscribeStream struct {
	ctx          context.Context
	cancel       context.CancelFunc
	audioChan    chan []byte
	resultChan   chan *TranscriptResult
	errorChan    chan error
	client       *transcribestreaming.Client
	language     string
	sampleRate   int32
	mu           sync.Mutex
	started      bool
	sessionID    string
	audioBuffer  []byte
	bufferMu     sync.Mutex
	lastSendTime time.Time
}

// 언어 코드 매핑 (내부 코드 -> AWS Transcribe 코드)
var transcribeLangCodes = map[string]types.LanguageCode{
	"ko": types.LanguageCodeKoKr,
	"en": types.LanguageCodeEnUs,
	"ja": types.LanguageCodeJaJp,
	"zh": types.LanguageCodeZhCn,
	"es": types.LanguageCodeEsEs,
	"fr": types.LanguageCodeFrFr,
	"de": types.LanguageCodeDeDe,
}

// NewTranscribeService TranscribeService 생성
func NewTranscribeService(cfg aws.Config) *TranscribeService {
	return &TranscribeService{cfg: cfg}
}

// StartStream 스트리밍 세션 시작
func (s *TranscribeService) StartStream(ctx context.Context, sessionID, language string, sampleRate int32) (*TranscribeStream, error) {
	streamCtx, cancel := context.WithCancel(ctx)

	stream := &TranscribeStream{
		ctx:          streamCtx,
		cancel:       cancel,
		audioChan:    make(chan []byte, 100),
		resultChan:   make(chan *TranscriptResult, 50),
		errorChan:    make(chan error, 1),
		client:       transcribestreaming.NewFromConfig(s.cfg),
		language:     language,
		sampleRate:   sampleRate,
		sessionID:    sessionID,
		audioBuffer:  make([]byte, 0, 32000), // 1초 분량 버퍼
		lastSendTime: time.Now(),
	}

	// 스트리밍 시작
	go stream.run()

	log.Printf("🎤 [%s] Transcribe stream started: lang=%s, sampleRate=%d", sessionID, language, sampleRate)

	return stream, nil
}

// run 스트리밍 처리
func (s *TranscribeStream) run() {
	defer close(s.resultChan)
	defer close(s.errorChan)

	// AWS 언어 코드
	langCode, ok := transcribeLangCodes[s.language]
	if !ok {
		langCode = types.LanguageCodeEnUs
	}

	// 스트리밍 시작
	resp, err := s.client.StartStreamTranscription(s.ctx, &transcribestreaming.StartStreamTranscriptionInput{
		LanguageCode:         langCode,
		MediaEncoding:        types.MediaEncodingPcm,
		MediaSampleRateHertz: aws.Int32(s.sampleRate),
	})
	if err != nil {
		log.Printf("❌ [%s] Failed to start transcription: %v", s.sessionID, err)
		s.errorChan <- fmt.Errorf("start transcription: %w", err)
		return
	}

	stream := resp.GetStream()
	if stream == nil {
		s.errorChan <- fmt.Errorf("stream is nil")
		return
	}
	defer stream.Close()

	s.mu.Lock()
	s.started = true
	s.mu.Unlock()

	// 결과 수신 고루틴
	go s.receiveResults(stream)

	// 오디오 전송
	s.sendAudio(stream)
}

// sendAudio 오디오 데이터 전송
func (s *TranscribeStream) sendAudio(stream *transcribestreaming.StartStreamTranscriptionEventStream) {
	// 버퍼링 타이머 (100ms 간격으로 전송)
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-s.ctx.Done():
			// 남은 버퍼 전송
			s.flushBuffer(stream)
			return

		case audio, ok := <-s.audioChan:
			if !ok {
				s.flushBuffer(stream)
				return
			}
			// 버퍼에 추가
			s.bufferMu.Lock()
			s.audioBuffer = append(s.audioBuffer, audio...)
			s.bufferMu.Unlock()

		case <-ticker.C:
			// 주기적으로 버퍼 전송
			s.flushBuffer(stream)
		}
	}
}

// flushBuffer 버퍼 데이터 전송
func (s *TranscribeStream) flushBuffer(stream *transcribestreaming.StartStreamTranscriptionEventStream) {
	s.bufferMu.Lock()
	if len(s.audioBuffer) == 0 {
		s.bufferMu.Unlock()
		return
	}
	data := s.audioBuffer
	s.audioBuffer = make([]byte, 0, 32000)
	s.bufferMu.Unlock()

	event := &types.AudioStreamMemberAudioEvent{
		Value: types.AudioEvent{
			AudioChunk: data,
		},
	}

	if err := stream.Send(s.ctx, event); err != nil {
		log.Printf("⚠️ [%s] Send audio error: %v", s.sessionID, err)
	}
}

// receiveResults 결과 수신
func (s *TranscribeStream) receiveResults(stream *transcribestreaming.StartStreamTranscriptionEventStream) {
	for event := range stream.Events() {
		switch e := event.(type) {
		case *types.TranscriptResultStreamMemberTranscriptEvent:
			if e.Value.Transcript == nil {
				continue
			}

			for _, result := range e.Value.Transcript.Results {
				if len(result.Alternatives) == 0 {
					continue
				}

				transcript := aws.ToString(result.Alternatives[0].Transcript)
				if transcript == "" {
					continue
				}

				isPartial := result.IsPartial

				// Partial 결과는 로그만, Final 결과만 전송
				if isPartial {
					log.Printf("📝 [%s] STT Partial: %s", s.sessionID, transcript)
				} else {
					log.Printf("✅ [%s] STT Final: %s", s.sessionID, transcript)
					select {
					case s.resultChan <- &TranscriptResult{
						Text:      transcript,
						IsPartial: isPartial,
						IsFinal:   !isPartial,
					}:
					default:
						log.Printf("⚠️ [%s] Result channel full", s.sessionID)
					}
				}
			}
		}
	}

	if err := stream.Err(); err != nil {
		log.Printf("⚠️ [%s] Stream error: %v", s.sessionID, err)
	}
}

// SendAudio 오디오 데이터 전송
func (s *TranscribeStream) SendAudio(data []byte) error {
	select {
	case s.audioChan <- data:
		return nil
	case <-s.ctx.Done():
		return s.ctx.Err()
	default:
		return fmt.Errorf("audio channel full")
	}
}

// Results 결과 채널 반환
func (s *TranscribeStream) Results() <-chan *TranscriptResult {
	return s.resultChan
}

// Errors 에러 채널 반환
func (s *TranscribeStream) Errors() <-chan error {
	return s.errorChan
}

// Close 스트림 종료
func (s *TranscribeStream) Close() {
	s.cancel()
	close(s.audioChan)
}
