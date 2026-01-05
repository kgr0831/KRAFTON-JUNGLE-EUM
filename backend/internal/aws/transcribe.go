package aws

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/transcribestreaming"
	"github.com/aws/aws-sdk-go-v2/service/transcribestreaming/types"
)

// Keep-alive configuration
const (
	KeepAliveInterval = 10 * time.Second // Send silence every 10 seconds
	SilenceChunkSize  = 3200             // 100ms of silence at 16kHz mono PCM
)

// TranscribeClient wraps Amazon Transcribe Streaming
type TranscribeClient struct {
	client     *transcribestreaming.Client
	sampleRate int32
}

// TranscribeStream represents an active transcription stream for a speaker
type TranscribeStream struct {
	speakerID  string
	sourceLang string

	eventStream *transcribestreaming.StartStreamTranscriptionEventStream
	ctx         context.Context
	cancel      context.CancelFunc

	// Output channel
	TranscriptChan chan *TranscriptResult

	// Audio input channel
	audioIn chan []byte

	// Keep-alive
	lastAudioTime time.Time
	keepAliveMu   sync.Mutex

	mu       sync.Mutex
	isClosed bool
}

// TranscriptResult represents a transcription result
type TranscriptResult struct {
	SpeakerID   string
	Text        string
	Language    string
	IsPartial   bool
	IsFinal     bool
	Confidence  float32
	TimestampMs uint64
}

// Transcribe 언어 코드 매핑
var transcribeLanguageCodes = map[string]types.LanguageCode{
	"ko": types.LanguageCodeKoKr,
	"en": types.LanguageCodeEnUs,
	"ja": types.LanguageCodeJaJp,
	"zh": types.LanguageCodeZhCn,
}

// NewTranscribeClient creates a new Transcribe Streaming client
func NewTranscribeClient(cfg aws.Config, sampleRate int32) *TranscribeClient {
	return &TranscribeClient{
		client:     transcribestreaming.NewFromConfig(cfg),
		sampleRate: sampleRate,
	}
}

// StartStream initiates a new transcription stream for a speaker
func (c *TranscribeClient) StartStream(ctx context.Context, speakerID, sourceLang string) (*TranscribeStream, error) {
	langCode, ok := transcribeLanguageCodes[sourceLang]
	if !ok {
		langCode = types.LanguageCodeEnUs
		log.Printf("[Transcribe] Unknown language '%s', defaulting to en-US", sourceLang)
	}

	log.Printf("[Transcribe] Starting stream for speaker %s (lang=%s)", speakerID, sourceLang)

	streamCtx, cancel := context.WithCancel(ctx)

	ts := &TranscribeStream{
		speakerID:      speakerID,
		sourceLang:     sourceLang,
		ctx:            streamCtx,
		cancel:         cancel,
		TranscriptChan: make(chan *TranscriptResult, 50),
		audioIn:        make(chan []byte, 100),
		lastAudioTime:  time.Now(),
		isClosed:       false,
	}

	// Start the transcription stream
	resp, err := c.client.StartStreamTranscription(streamCtx, &transcribestreaming.StartStreamTranscriptionInput{
		LanguageCode:         langCode,
		MediaEncoding:        types.MediaEncodingPcm,
		MediaSampleRateHertz: aws.Int32(c.sampleRate),
	})
	if err != nil {
		log.Printf("[Transcribe] ERROR StartStreamTranscription failed: %v", err)
		cancel()
		return nil, err
	}

	ts.eventStream = resp.GetStream()

	// Start goroutines
	go ts.sendAudioLoop()
	go ts.receiveLoop()
	go ts.keepAliveLoop() // Keep-alive goroutine

	log.Printf("[Transcribe] Stream started for speaker %s", speakerID)

	return ts, nil
}

// MaxAudioChunkSize is the recommended audio chunk size for AWS Transcribe
const MaxAudioChunkSize = 3200

// SendAudio sends audio data to the transcription stream
func (ts *TranscribeStream) SendAudio(audioData []byte) error {
	ts.mu.Lock()
	if ts.isClosed {
		ts.mu.Unlock()
		return nil
	}
	ts.mu.Unlock()

	// Update last audio time for keep-alive
	ts.keepAliveMu.Lock()
	ts.lastAudioTime = time.Now()
	ts.keepAliveMu.Unlock()

	// Split large audio into chunks
	for offset := 0; offset < len(audioData); offset += MaxAudioChunkSize {
		end := offset + MaxAudioChunkSize
		if end > len(audioData) {
			end = len(audioData)
		}
		chunk := audioData[offset:end]

		select {
		case ts.audioIn <- chunk:
		case <-ts.ctx.Done():
			return ts.ctx.Err()
		default:
			// Buffer full, skip
			return nil
		}
	}
	return nil
}

// keepAliveLoop sends silence audio to keep the stream alive
func (ts *TranscribeStream) keepAliveLoop() {
	ticker := time.NewTicker(KeepAliveInterval)
	defer ticker.Stop()

	// Pre-allocate silence buffer (all zeros = silence in PCM)
	silenceChunk := make([]byte, SilenceChunkSize)

	for {
		select {
		case <-ts.ctx.Done():
			return
		case <-ticker.C:
			ts.keepAliveMu.Lock()
			timeSinceLastAudio := time.Since(ts.lastAudioTime)
			ts.keepAliveMu.Unlock()

			// Only send silence if no audio received recently
			if timeSinceLastAudio >= KeepAliveInterval-time.Second {
				ts.mu.Lock()
				closed := ts.isClosed
				ts.mu.Unlock()

				if !closed {
					select {
					case ts.audioIn <- silenceChunk:
						// Silence sent successfully
					default:
						// Buffer full, skip
					}
				}
			}
		}
	}
}

// sendAudioLoop sends audio chunks to Transcribe
func (ts *TranscribeStream) sendAudioLoop() {
	defer func() {
		ts.mu.Lock()
		ts.isClosed = true
		ts.mu.Unlock()
		if ts.eventStream != nil {
			ts.eventStream.Close()
		}
	}()

	audioChunkCount := 0
	totalBytesSent := 0

	for {
		select {
		case <-ts.ctx.Done():
			return
		case audioData, ok := <-ts.audioIn:
			if !ok {
				return
			}

			audioChunkCount++
			totalBytesSent += len(audioData)

			// Log only first chunk and every 100th
			if audioChunkCount == 1 || audioChunkCount%100 == 0 {
				log.Printf("[Transcribe] Audio chunk #%d for %s (total: %d bytes)",
					audioChunkCount, ts.speakerID, totalBytesSent)
			}

			err := ts.eventStream.Send(ts.ctx, &types.AudioStreamMemberAudioEvent{
				Value: types.AudioEvent{
					AudioChunk: audioData,
				},
			})
			if err != nil {
				log.Printf("[Transcribe] Send error for %s: %v", ts.speakerID, err)
				return
			}
		}
	}
}

// receiveLoop receives transcript results from Transcribe
func (ts *TranscribeStream) receiveLoop() {
	log.Printf("[Transcribe] 🎧 receiveLoop started for speaker %s", ts.speakerID)

	defer func() {
		ts.mu.Lock()
		ts.isClosed = true
		ts.mu.Unlock()
		close(ts.TranscriptChan)
		log.Printf("[Transcribe] 🔚 receiveLoop ended for speaker %s", ts.speakerID)
	}()

	events := ts.eventStream.Events()

	for event := range events {
		select {
		case <-ts.ctx.Done():
			log.Printf("[Transcribe] ⏹️ Context cancelled for speaker %s", ts.speakerID)
			return
		default:
		}

		switch e := event.(type) {
		case *types.TranscriptResultStreamMemberTranscriptEvent:
			ts.handleTranscriptEvent(e.Value)
		}
	}

	if err := ts.eventStream.Err(); err != nil {
		log.Printf("[Transcribe] ❌ Stream error for %s: %v", ts.speakerID, err)
	} else {
		log.Printf("[Transcribe] ℹ️ Event stream ended normally for %s", ts.speakerID)
	}
}

// handleTranscriptEvent processes a transcript event
func (ts *TranscribeStream) handleTranscriptEvent(event types.TranscriptEvent) {
	if event.Transcript == nil || len(event.Transcript.Results) == 0 {
		return
	}

	for _, result := range event.Transcript.Results {
		if len(result.Alternatives) == 0 {
			continue
		}

		alt := result.Alternatives[0]
		transcript := aws.ToString(alt.Transcript)

		if transcript == "" {
			continue
		}

		isPartial := result.IsPartial

		var confidence float32 = 1.0
		if len(alt.Items) > 0 && alt.Items[0].Confidence != nil {
			confidence = float32(*alt.Items[0].Confidence)
		}

		// Debug log for transcript reception
		if isPartial {
			log.Printf("[Transcribe] 📝 Partial from %s: '%s' (confidence: %.2f)", ts.speakerID, transcript, confidence)
		} else {
			log.Printf("[Transcribe] ✅ Final from %s: '%s' (confidence: %.2f)", ts.speakerID, transcript, confidence)
		}

		select {
		case ts.TranscriptChan <- &TranscriptResult{
			SpeakerID:   ts.speakerID,
			Text:        transcript,
			Language:    ts.sourceLang,
			IsPartial:   isPartial,
			IsFinal:     !isPartial,
			Confidence:  confidence,
			TimestampMs: uint64(time.Now().UnixMilli()),
		}:
		default:
			log.Printf("[Transcribe] ⚠️ Channel full, dropping transcript: '%s'", transcript)
		}
	}
}

// IsClosed returns whether the stream has been closed
func (ts *TranscribeStream) IsClosed() bool {
	ts.mu.Lock()
	defer ts.mu.Unlock()
	return ts.isClosed
}

// Close terminates the transcription stream
func (ts *TranscribeStream) Close() error {
	ts.mu.Lock()
	if ts.isClosed {
		ts.mu.Unlock()
		return nil
	}
	ts.isClosed = true
	ts.mu.Unlock()

	ts.cancel()
	close(ts.audioIn)

	log.Printf("[Transcribe] Closed stream for speaker %s", ts.speakerID)
	return nil
}
