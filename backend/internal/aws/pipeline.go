package aws

import (
	"context"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/google/uuid"

	"realtime-backend/internal/ai"
	appconfig "realtime-backend/internal/config"
	"realtime-backend/pb"
)

// Stream timeout configuration
const (
	StreamIdleTimeout = 30 * time.Minute // Close stream after 30 minutes of inactivity
)

// Pipeline orchestrates STT -> Translate -> TTS flow using AWS services
type Pipeline struct {
	transcribe *TranscribeClient
	translate  *TranslateClient
	polly      *PollyClient
	cache      *PipelineCache

	// Per-speaker streams with last activity tracking
	speakerStreams   map[string]*TranscribeStream
	streamLastActive map[string]time.Time
	streamsMu        sync.RWMutex

	// Output channels (compatible with ai.ChatStream)
	TranscriptChan chan *ai.TranscriptMessage
	AudioChan      chan *ai.AudioMessage
	ErrChan        chan error

	// Target languages for this room
	targetLanguages []string
	targetLangsMu   sync.RWMutex

	ctx    context.Context
	cancel context.CancelFunc
}

// PipelineConfig configuration for pipeline
type PipelineConfig struct {
	TargetLanguages []string
	SampleRate      int32
}

// NewPipeline creates a new AWS AI pipeline
func NewPipeline(ctx context.Context, cfg *appconfig.Config, pipelineCfg *PipelineConfig) (*Pipeline, error) {
	// Load AWS config using S3 credentials
	awsCfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion(cfg.S3.Region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			cfg.S3.AccessKeyID,
			cfg.S3.SecretAccessKey,
			"",
		)),
	)
	if err != nil {
		return nil, err
	}

	pCtx, cancel := context.WithCancel(ctx)

	sampleRate := int32(16000)
	if pipelineCfg != nil && pipelineCfg.SampleRate > 0 {
		sampleRate = pipelineCfg.SampleRate
	}

	targetLangs := []string{"en"}
	if pipelineCfg != nil && len(pipelineCfg.TargetLanguages) > 0 {
		targetLangs = pipelineCfg.TargetLanguages
	}

	log.Printf("[AWS Pipeline] Initializing with region=%s, sampleRate=%d, targetLangs=%v",
		cfg.S3.Region, sampleRate, targetLangs)

	pipeline := &Pipeline{
		transcribe:       NewTranscribeClient(awsCfg, sampleRate),
		translate:        NewTranslateClient(awsCfg),
		polly:            NewPollyClient(awsCfg),
		cache:            NewPipelineCache(DefaultCacheConfig()),
		speakerStreams:   make(map[string]*TranscribeStream),
		streamLastActive: make(map[string]time.Time),
		TranscriptChan:   make(chan *ai.TranscriptMessage, 50),
		AudioChan:        make(chan *ai.AudioMessage, 100),
		ErrChan:          make(chan error, 10),
		targetLanguages:  targetLangs,
		ctx:              pCtx,
		cancel:           cancel,
	}

	// Start stream timeout checker
	go pipeline.streamTimeoutChecker()

	return pipeline, nil
}

// streamTimeoutChecker periodically checks and closes idle streams
func (p *Pipeline) streamTimeoutChecker() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-p.ctx.Done():
			return
		case <-ticker.C:
			p.closeIdleStreams()
		}
	}
}

// closeIdleStreams closes streams that have been idle for too long
func (p *Pipeline) closeIdleStreams() {
	p.streamsMu.Lock()
	defer p.streamsMu.Unlock()

	now := time.Now()
	for key, lastActive := range p.streamLastActive {
		if now.Sub(lastActive) > StreamIdleTimeout {
			if stream, exists := p.speakerStreams[key]; exists {
				stream.Close()
				delete(p.speakerStreams, key)
				delete(p.streamLastActive, key)
				log.Printf("[AWS Pipeline] Closed idle stream: %s (inactive for %v)", key, now.Sub(lastActive))
			}
		}
	}
}

// ProcessAudio handles incoming audio from a speaker
func (p *Pipeline) ProcessAudio(speakerID, sourceLang, speakerName string, audioData []byte) error {
	// Debug log disabled to reduce noise
	// log.Printf("[AWS Pipeline] ProcessAudio called: speaker=%s, lang=%s, audioSize=%d bytes",
	// 	speakerID, sourceLang, len(audioData))

	stream, err := p.getOrCreateStream(speakerID, sourceLang)
	if err != nil {
		log.Printf("[AWS Pipeline] ERROR getting/creating stream: %v", err)
		return err
	}

	// Update last activity time for this stream
	key := speakerID + ":" + sourceLang
	p.streamsMu.Lock()
	p.streamLastActive[key] = time.Now()
	p.streamsMu.Unlock()

	if err := stream.SendAudio(audioData); err != nil {
		log.Printf("[AWS Pipeline] ERROR sending audio: %v", err)
		return err
	}

	return nil
}

// getOrCreateStream gets existing or creates new Transcribe stream for speaker
func (p *Pipeline) getOrCreateStream(speakerID, sourceLang string) (*TranscribeStream, error) {
	key := speakerID + ":" + sourceLang

	p.streamsMu.RLock()
	stream, exists := p.speakerStreams[key]
	p.streamsMu.RUnlock()

	// Check if existing stream is still alive
	if exists {
		if stream.IsClosed() {
			// Stream is dead, remove it and create new one
			p.streamsMu.Lock()
			delete(p.speakerStreams, key)
			delete(p.streamLastActive, key)
			p.streamsMu.Unlock()
			log.Printf("[AWS Pipeline] Removed dead stream for speaker %s, will recreate", speakerID)
		} else {
			return stream, nil
		}
	}

	p.streamsMu.Lock()
	defer p.streamsMu.Unlock()

	// Double-check
	if stream, exists := p.speakerStreams[key]; exists {
		return stream, nil
	}

	// Create new stream
	stream, err := p.transcribe.StartStream(p.ctx, speakerID, sourceLang)
	if err != nil {
		log.Printf("[AWS Pipeline] Failed to create Transcribe stream for speaker %s: %v", speakerID, err)
		return nil, err
	}

	p.speakerStreams[key] = stream

	// Start processing transcripts from this stream
	go p.processTranscripts(stream, sourceLang)

	log.Printf("[AWS Pipeline] Created Transcribe stream for speaker %s (lang: %s)", speakerID, sourceLang)

	return stream, nil
}

// processTranscripts handles transcripts from a speaker stream
func (p *Pipeline) processTranscripts(stream *TranscribeStream, sourceLang string) {
	log.Printf("[AWS Pipeline] 🔄 processTranscripts started for stream (sourceLang: %s)", sourceLang)

	// Track last partial text for delta TTS (only send new portion)
	var lastPartialText string
	var lastTTSSentText string

	for result := range stream.TranscriptChan {
		log.Printf("[AWS Pipeline] 📨 Received transcript: '%s' (isFinal: %v, confidence: %.2f, lang: %s)",
			result.Text, result.IsFinal, result.Confidence, sourceLang)

		// For Korean→Japanese: translate and TTS partials immediately for real-time experience
		if sourceLang == "ko" && !result.IsFinal {
			text := strings.TrimSpace(result.Text)
			sentTranslatedPartial := false

			// Only process if text is long enough and different from last
			if len([]rune(text)) >= 3 && text != lastPartialText {
				// Check if Japanese is in target languages
				p.targetLangsMu.RLock()
				hasJapaneseTarget := false
				for _, lang := range p.targetLanguages {
					if lang == "ja" {
						hasJapaneseTarget = true
						break
					}
				}
				p.targetLangsMu.RUnlock()

				if hasJapaneseTarget {
					// Calculate delta (new portion only)
					deltaText := text
					if strings.HasPrefix(text, lastTTSSentText) && len(text) > len(lastTTSSentText) {
						deltaText = strings.TrimSpace(text[len(lastTTSSentText):])
					}

					// Only send TTS if delta is meaningful (at least 2 characters)
					if len([]rune(deltaText)) >= 2 {
						lastTTSSentText = text
						// Process delta with translation AND TTS for Japanese
						// This already sends transcript, so don't send again
						go p.processPartialWithTranslationAndTTS(result, sourceLang, "ja", deltaText)
						sentTranslatedPartial = true
					}
				}
				lastPartialText = text
			}

			// Only send regular partial if we didn't already send a translated partial
			if !sentTranslatedPartial {
				p.sendPartialTranscript(result)
			}
			continue
		}

		// For other languages: send partial without translation
		if !result.IsFinal {
			p.sendPartialTranscript(result)
			continue
		}

		// For Korean→Japanese: skip TTS in final since we already sent chunk TTS
		// Check if we sent any partial TTS
		sentPartialTTS := lastTTSSentText != ""

		// Reset partial tracking for final result
		lastPartialText = ""
		lastTTSSentText = ""

		// Process final result: Translate + TTS (skip TTS if we already sent partials for KO→JA)
		if sourceLang == "ko" && sentPartialTTS {
			// Check if Japanese is in targets
			p.targetLangsMu.RLock()
			hasJapaneseTarget := false
			for _, lang := range p.targetLanguages {
				if lang == "ja" {
					hasJapaneseTarget = true
					break
				}
			}
			p.targetLangsMu.RUnlock()

			if hasJapaneseTarget {
				// Skip TTS for Japanese since we already sent chunk TTS
				go p.processFinalTranscriptNoTTS(result, sourceLang, "ja")
				continue
			}
		}

		// Process final result: Translate + TTS
		go p.processFinalTranscript(result, sourceLang)
	}
	log.Printf("[AWS Pipeline] 🔚 processTranscripts ended for stream")
}

// processPartialWithTranslationAndTTS handles partial transcripts with translation AND TTS (for Korean→Japanese real-time)
// deltaText is the new portion of text (not already sent for TTS)
func (p *Pipeline) processPartialWithTranslationAndTTS(result *TranscriptResult, sourceLang, targetLang, deltaText string) {
	ctx, cancel := context.WithTimeout(p.ctx, 5*time.Second)
	defer cancel()

	if deltaText == "" {
		return
	}

	log.Printf("[AWS Pipeline] 🇯🇵 Processing delta chunk: '%s'", deltaText)

	// Translate the delta text
	trans, err := p.translate.Translate(ctx, deltaText, sourceLang, targetLang)
	if err != nil {
		log.Printf("[AWS Pipeline] Partial translation error: %v", err)
		return
	}

	if trans.TranslatedText == "" {
		return
	}

	// Build transcript message (with full original text for display)
	transcriptMsg := &ai.TranscriptMessage{
		ID:               uuid.New().String(),
		OriginalText:     result.Text, // Full text for display
		OriginalLanguage: sourceLang,
		IsPartial:        true,
		IsFinal:          false,
		TimestampMs:      result.TimestampMs,
		Confidence:       result.Confidence,
		Translations: []*pb.TranslationEntry{
			{
				TargetLanguage: targetLang,
				TranslatedText: trans.TranslatedText, // Delta translation
			},
		},
		Speaker: &pb.SpeakerInfo{
			ParticipantId:  result.SpeakerID,
			SourceLanguage: sourceLang,
		},
	}

	// Send transcript
	select {
	case p.TranscriptChan <- transcriptMsg:
		log.Printf("[AWS Pipeline] 🇯🇵 KO→JA chunk: '%s' → '%s'", deltaText, trans.TranslatedText)
	default:
		log.Printf("[AWS Pipeline] Transcript channel full (KO→JA partial)")
	}

	// Generate TTS immediately for the delta translation
	audio, err := p.polly.Synthesize(ctx, trans.TranslatedText, targetLang)
	if err != nil {
		log.Printf("[AWS Pipeline] Partial TTS error: %v", err)
		return
	}

	if len(audio.AudioData) == 0 {
		return
	}

	// Send TTS audio
	audioMsg := &ai.AudioMessage{
		TranscriptID:         transcriptMsg.ID,
		TargetLanguage:       targetLang,
		AudioData:            audio.AudioData,
		Format:               audio.Format,
		SampleRate:           uint32(audio.SampleRate),
		SpeakerParticipantID: result.SpeakerID,
	}

	select {
	case p.AudioChan <- audioMsg:
		log.Printf("[AWS Pipeline] 🔊 KO→JA chunk TTS: '%s' (%d bytes)", trans.TranslatedText, len(audio.AudioData))
	default:
		log.Printf("[AWS Pipeline] Audio channel full (KO→JA partial)")
	}
}

// sendPartialTranscript sends a partial transcript without translation
func (p *Pipeline) sendPartialTranscript(result *TranscriptResult) {
	// Apply lighter noise filtering for partials (allow lower confidence for real-time feedback)
	text := strings.TrimSpace(result.Text)
	runes := []rune(text)

	// Skip empty or single character
	if len(runes) < 1 {
		return
	}

	// Skip very low confidence partials
	if result.Confidence > 0 && result.Confidence < 0.4 {
		return
	}

	// Skip repeated single characters
	if len(runes) >= 3 {
		allSame := true
		for i := 1; i < len(runes); i++ {
			if runes[i] != runes[0] {
				allSame = false
				break
			}
		}
		if allSame {
			return
		}
	}

	msg := &ai.TranscriptMessage{
		ID:               uuid.New().String(),
		OriginalText:     result.Text,
		OriginalLanguage: result.Language,
		IsPartial:        true,
		IsFinal:          false,
		TimestampMs:      result.TimestampMs,
		Confidence:       result.Confidence,
		Speaker: &pb.SpeakerInfo{
			ParticipantId:  result.SpeakerID,
			SourceLanguage: result.Language,
		},
	}

	select {
	case p.TranscriptChan <- msg:
	default:
		log.Printf("[AWS Pipeline] Transcript channel full (partial)")
	}
}

// Noise filtering constants
const (
	MinTextLengthForTranslation = 2
	MinConfidenceThreshold      = 0.5 // Lowered from 0.65 to reduce false filtering
)

// Common noise words/phrases that are often hallucinated by STT
var noisePatterns = map[string][]string{
	"ko": {
		"네", "예", "아", "어", "음", "응", "흠", "에", "으", "이",
		"그", "저", "뭐", "좀", "자", "서", "거", "게", "요", "야",
		"MBC 뉴스", "KBS 뉴스", "SBS 뉴스", "YTN", "JTBC",
		"자막 제공", "자막 협찬", "자막", "제공", "협찬",
		"구독", "좋아요", "알림", "시청", "감사",
	},
	"en": {
		"um", "uh", "ah", "oh", "eh", "hm", "hmm", "yeah", "yep", "nope",
		"like", "so", "well", "okay", "ok", "right", "you know",
		"subscribe", "like and subscribe", "thanks for watching",
		"MBC News", "KBS News", "breaking news",
	},
	"ja": {
		"えー", "あー", "うん", "ええ", "はい", "ねえ", "まあ",
		"字幕", "提供", "ニュース",
	},
	"zh": {
		"嗯", "啊", "哦", "呃", "好", "对", "是",
		"字幕", "新闻", "订阅",
	},
}

// isNoiseText checks if text is likely noise/hallucination
func isNoiseText(text string, sourceLang string, confidence float32) bool {
	text = strings.TrimSpace(text)
	runes := []rune(text)

	// Empty or too short
	if len(runes) < MinTextLengthForTranslation {
		return true
	}

	// Low confidence
	if confidence > 0 && confidence < MinConfidenceThreshold {
		return true
	}

	// Check for repeated characters (e.g., "아아아아", "ㅋㅋㅋ")
	if len(runes) >= 3 {
		allSame := true
		for i := 1; i < len(runes); i++ {
			if runes[i] != runes[0] {
				allSame = false
				break
			}
		}
		if allSame {
			return true
		}
	}

	// Check for punctuation/whitespace only
	hasAlphanumeric := false
	for _, r := range runes {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') ||
			(r >= '0' && r <= '9') ||
			(r >= 0xAC00 && r <= 0xD7AF) || // Korean Hangul
			(r >= 0x3040 && r <= 0x30FF) || // Japanese Hiragana/Katakana
			(r >= 0x4E00 && r <= 0x9FFF) { // Chinese characters
			hasAlphanumeric = true
			break
		}
	}
	if !hasAlphanumeric {
		return true
	}

	// Check against noise patterns for the source language
	textLower := strings.ToLower(text)

	// Check all languages (hallucinations can come in wrong language)
	for _, patterns := range noisePatterns {
		for _, pattern := range patterns {
			patternLower := strings.ToLower(pattern)
			// Exact match or text is just the noise pattern
			if textLower == patternLower {
				return true
			}
			// Text starts and ends with noise pattern (allowing for minor variations)
			if len(runes) <= len([]rune(pattern))+2 && strings.Contains(textLower, patternLower) {
				return true
			}
		}
	}

	return false
}

// processFinalTranscript handles translation and TTS for final transcripts
func (p *Pipeline) processFinalTranscript(result *TranscriptResult, sourceLang string) {
	ctx, cancel := context.WithTimeout(p.ctx, 15*time.Second)
	defer cancel()

	// Get target languages
	p.targetLangsMu.RLock()
	targetLangs := make([]string, len(p.targetLanguages))
	copy(targetLangs, p.targetLanguages)
	p.targetLangsMu.RUnlock()

	// Enhanced noise filtering
	text := strings.TrimSpace(result.Text)
	if isNoiseText(text, sourceLang, result.Confidence) {
		// Only log if it's not a super short text to reduce log spam
		if len([]rune(text)) >= 2 {
			log.Printf("[AWS Pipeline] Filtering noise: '%s' (confidence: %.2f)", text, result.Confidence)
		}
		return
	}

	log.Printf("[AWS Pipeline] Processing final transcript from %s: '%s' (lang: %s, confidence: %.2f)",
		result.SpeakerID, result.Text, sourceLang, result.Confidence)

	// Translate to all target languages (with caching)
	translations := make(map[string]*TranslationResult)
	var translateWg sync.WaitGroup
	var translateMu sync.Mutex

	for _, targetLang := range targetLangs {
		if targetLang == sourceLang {
			continue
		}

		translateWg.Add(1)
		go func(tgtLang string) {
			defer translateWg.Done()

			// Check cache first
			if cached, ok := p.cache.GetTranslation(result.Text, sourceLang, tgtLang); ok {
				translateMu.Lock()
				translations[tgtLang] = cached
				translateMu.Unlock()
				return
			}

			// Call Translate API
			trans, err := p.translate.Translate(ctx, result.Text, sourceLang, tgtLang)
			if err != nil {
				log.Printf("[AWS Pipeline] Translation error for %s: %v", tgtLang, err)
				return
			}

			// Store in cache
			p.cache.SetTranslation(result.Text, sourceLang, tgtLang, trans)

			translateMu.Lock()
			translations[tgtLang] = trans
			translateMu.Unlock()
		}(targetLang)
	}
	translateWg.Wait()

	// Build transcript message with translations
	transcriptMsg := &ai.TranscriptMessage{
		ID:               uuid.New().String(),
		OriginalText:     result.Text,
		OriginalLanguage: sourceLang,
		IsPartial:        false,
		IsFinal:          true,
		TimestampMs:      result.TimestampMs,
		Confidence:       result.Confidence,
		Translations:     make([]*pb.TranslationEntry, 0),
		Speaker: &pb.SpeakerInfo{
			ParticipantId:  result.SpeakerID,
			SourceLanguage: sourceLang,
		},
	}

	for lang, trans := range translations {
		if trans != nil {
			transcriptMsg.Translations = append(transcriptMsg.Translations, &pb.TranslationEntry{
				TargetLanguage: lang,
				TranslatedText: trans.TranslatedText,
			})
		}
	}

	// Send transcript
	select {
	case p.TranscriptChan <- transcriptMsg:
		log.Printf("[AWS Pipeline] Sent transcript with %d translations", len(transcriptMsg.Translations))
	default:
		log.Printf("[AWS Pipeline] Transcript channel full")
	}

	// Generate TTS for each target language (parallel, with caching)
	log.Printf("[AWS Pipeline] 🔊 Generating TTS for %d translations", len(translations))

	var wg sync.WaitGroup
	for lang, trans := range translations {
		// Skip TTS for original language
		if lang == sourceLang {
			log.Printf("[AWS Pipeline] ⏭️ Skipping TTS for source language: %s", lang)
			continue
		}
		if trans == nil {
			log.Printf("[AWS Pipeline] ⏭️ Skipping TTS: translation is nil for %s", lang)
			continue
		}
		if trans.TranslatedText == "" {
			log.Printf("[AWS Pipeline] ⏭️ Skipping TTS: empty translation for %s", lang)
			continue
		}

		wg.Add(1)
		go func(targetLang, text string) {
			defer wg.Done()

			log.Printf("[AWS Pipeline] 🎙️ Generating TTS for '%s' in %s", text, targetLang)

			var audioData []byte
			var format string = "mp3"
			var sampleRate int32 = 24000

			// Check TTS cache first
			if cached, ok := p.cache.GetTTS(text, targetLang); ok {
				audioData = cached
				log.Printf("[AWS Pipeline] 📦 TTS cache hit for %s", targetLang)
			} else {
				// Call Polly API
				audio, err := p.polly.Synthesize(ctx, text, targetLang)
				if err != nil {
					log.Printf("[AWS Pipeline] ❌ TTS error for %s: %v", targetLang, err)
					return
				}

				if len(audio.AudioData) == 0 {
					log.Printf("[AWS Pipeline] ⚠️ Empty audio data from Polly for %s", targetLang)
					return
				}

				// Store in cache
				p.cache.SetTTS(text, targetLang, audio.AudioData)

				audioData = audio.AudioData
				format = audio.Format
				sampleRate = audio.SampleRate
			}

			audioMsg := &ai.AudioMessage{
				TranscriptID:         transcriptMsg.ID,
				TargetLanguage:       targetLang,
				AudioData:            audioData,
				Format:               format,
				SampleRate:           uint32(sampleRate),
				SpeakerParticipantID: result.SpeakerID,
			}

			select {
			case p.AudioChan <- audioMsg:
				log.Printf("[AWS Pipeline] ✅ Sent TTS audio for %s (%d bytes)", targetLang, len(audioData))
			default:
				log.Printf("[AWS Pipeline] ⚠️ Audio channel full for %s", targetLang)
			}
		}(lang, trans.TranslatedText)
	}
	wg.Wait()
	log.Printf("[AWS Pipeline] 🔊 TTS generation complete")
}

// processFinalTranscriptNoTTS handles translation for final transcripts, but skips TTS for specified language
// Used when chunk TTS was already sent during partials (e.g., Korean→Japanese real-time TTS)
func (p *Pipeline) processFinalTranscriptNoTTS(result *TranscriptResult, sourceLang, skipTTSLang string) {
	ctx, cancel := context.WithTimeout(p.ctx, 15*time.Second)
	defer cancel()

	// Get target languages
	p.targetLangsMu.RLock()
	targetLangs := make([]string, len(p.targetLanguages))
	copy(targetLangs, p.targetLanguages)
	p.targetLangsMu.RUnlock()

	// Enhanced noise filtering
	text := strings.TrimSpace(result.Text)
	if isNoiseText(text, sourceLang, result.Confidence) {
		if len([]rune(text)) >= 2 {
			log.Printf("[AWS Pipeline] Filtering noise (NoTTS): '%s' (confidence: %.2f)", text, result.Confidence)
		}
		return
	}

	log.Printf("[AWS Pipeline] Processing final transcript (skip TTS for %s): '%s'", skipTTSLang, result.Text)

	// Translate to all target languages (with caching)
	translations := make(map[string]*TranslationResult)
	var translateWg sync.WaitGroup
	var translateMu sync.Mutex

	for _, targetLang := range targetLangs {
		if targetLang == sourceLang {
			continue
		}

		translateWg.Add(1)
		go func(tgtLang string) {
			defer translateWg.Done()

			// Check cache first
			if cached, ok := p.cache.GetTranslation(result.Text, sourceLang, tgtLang); ok {
				translateMu.Lock()
				translations[tgtLang] = cached
				translateMu.Unlock()
				return
			}

			// Call Translate API
			trans, err := p.translate.Translate(ctx, result.Text, sourceLang, tgtLang)
			if err != nil {
				log.Printf("[AWS Pipeline] Translation error for %s: %v", tgtLang, err)
				return
			}

			// Store in cache
			p.cache.SetTranslation(result.Text, sourceLang, tgtLang, trans)

			translateMu.Lock()
			translations[tgtLang] = trans
			translateMu.Unlock()
		}(targetLang)
	}
	translateWg.Wait()

	// Build transcript message with translations
	transcriptMsg := &ai.TranscriptMessage{
		ID:               uuid.New().String(),
		OriginalText:     result.Text,
		OriginalLanguage: sourceLang,
		IsPartial:        false,
		IsFinal:          true,
		TimestampMs:      result.TimestampMs,
		Confidence:       result.Confidence,
		Translations:     make([]*pb.TranslationEntry, 0),
		Speaker: &pb.SpeakerInfo{
			ParticipantId:  result.SpeakerID,
			SourceLanguage: sourceLang,
		},
	}

	for lang, trans := range translations {
		if trans != nil {
			transcriptMsg.Translations = append(transcriptMsg.Translations, &pb.TranslationEntry{
				TargetLanguage: lang,
				TranslatedText: trans.TranslatedText,
			})
		}
	}

	// Send transcript
	select {
	case p.TranscriptChan <- transcriptMsg:
		log.Printf("[AWS Pipeline] Sent transcript (NoTTS for %s) with %d translations", skipTTSLang, len(transcriptMsg.Translations))
	default:
		log.Printf("[AWS Pipeline] Transcript channel full")
	}

	// Generate TTS for each target language EXCEPT skipTTSLang
	var wg sync.WaitGroup
	for lang, trans := range translations {
		// Skip TTS for original language
		if lang == sourceLang {
			continue
		}
		// Skip TTS for the specified language (already sent chunk TTS)
		if lang == skipTTSLang {
			log.Printf("[AWS Pipeline] ⏭️ Skipping final TTS for %s (chunk TTS already sent)", lang)
			continue
		}
		if trans == nil || trans.TranslatedText == "" {
			continue
		}

		wg.Add(1)
		go func(targetLang, text string) {
			defer wg.Done()

			log.Printf("[AWS Pipeline] 🎙️ Generating TTS for '%s' in %s", text, targetLang)

			var audioData []byte
			var format string = "mp3"
			var sampleRate int32 = 24000

			// Check TTS cache first
			if cached, ok := p.cache.GetTTS(text, targetLang); ok {
				audioData = cached
			} else {
				// Call Polly API
				audio, err := p.polly.Synthesize(ctx, text, targetLang)
				if err != nil {
					log.Printf("[AWS Pipeline] ❌ TTS error for %s: %v", targetLang, err)
					return
				}

				if len(audio.AudioData) == 0 {
					return
				}

				// Store in cache
				p.cache.SetTTS(text, targetLang, audio.AudioData)

				audioData = audio.AudioData
				format = audio.Format
				sampleRate = audio.SampleRate
			}

			audioMsg := &ai.AudioMessage{
				TranscriptID:         transcriptMsg.ID,
				TargetLanguage:       targetLang,
				AudioData:            audioData,
				Format:               format,
				SampleRate:           uint32(sampleRate),
				SpeakerParticipantID: result.SpeakerID,
			}

			select {
			case p.AudioChan <- audioMsg:
				log.Printf("[AWS Pipeline] ✅ Sent TTS audio for %s (%d bytes)", targetLang, len(audioData))
			default:
				log.Printf("[AWS Pipeline] ⚠️ Audio channel full for %s", targetLang)
			}
		}(lang, trans.TranslatedText)
	}
	wg.Wait()
}

// sendError sends an error to the error channel
func (p *Pipeline) sendError(err error) {
	select {
	case p.ErrChan <- err:
	default:
	}
}

// UpdateTargetLanguages updates the list of target languages
func (p *Pipeline) UpdateTargetLanguages(langs []string) {
	p.targetLangsMu.Lock()
	defer p.targetLangsMu.Unlock()
	p.targetLanguages = langs
	log.Printf("[AWS Pipeline] Updated target languages: %v", langs)
}

// RemoveSpeakerStream removes a speaker's transcription stream
func (p *Pipeline) RemoveSpeakerStream(speakerID, sourceLang string) {
	key := speakerID + ":" + sourceLang

	p.streamsMu.Lock()
	defer p.streamsMu.Unlock()

	if stream, exists := p.speakerStreams[key]; exists {
		stream.Close()
		delete(p.speakerStreams, key)
		log.Printf("[AWS Pipeline] Removed stream for speaker %s", speakerID)
	}
}

// Close shuts down the pipeline
func (p *Pipeline) Close() error {
	p.cancel()

	p.streamsMu.Lock()
	for key, stream := range p.speakerStreams {
		stream.Close()
		delete(p.speakerStreams, key)
	}
	p.streamsMu.Unlock()

	// Close cache
	if p.cache != nil {
		p.cache.Close()
	}

	close(p.TranscriptChan)
	close(p.AudioChan)
	close(p.ErrChan)

	log.Printf("[AWS Pipeline] Pipeline closed")
	return nil
}
