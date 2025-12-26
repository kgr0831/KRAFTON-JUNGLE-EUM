package handler

import (
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/gofiber/contrib/websocket"

	"realtime-backend/internal/config"
	"realtime-backend/internal/model"
	"realtime-backend/internal/session"
)

// AudioHandler 오디오 WebSocket 핸들러
type AudioHandler struct {
	cfg *config.Config
}

// NewAudioHandler AudioHandler 생성자
func NewAudioHandler(cfg *config.Config) *AudioHandler {
	return &AudioHandler{cfg: cfg}
}

// HandleWebSocket 오디오 스트리밍 WebSocket 연결 처리
func (h *AudioHandler) HandleWebSocket(c *websocket.Conn) {
	// 세션 초기화
	sess := session.New(h.cfg.Audio.ChannelBufferSize)

	log.Printf("🔗 [%s] New WebSocket connection established", sess.ID)

	// Graceful Shutdown & Resource Cleanup
	defer func() {
		// 1. 세션 정리 (채널 닫기, 컨텍스트 취소)
		sess.Close()

		// 2. 통계 로깅
		packetCount, audioBytes := sess.GetStats()
		log.Printf("🔌 [%s] Connection closed. Duration: %v, Packets: %d, Total bytes: %d",
			sess.ID, sess.Duration().Round(time.Second), packetCount, audioBytes)

		// 3. WebSocket 연결 종료
		if err := c.Close(); err != nil {
			log.Printf("⚠️ [%s] Error closing WebSocket: %v", sess.ID, err)
		}
	}()

	// 비동기 오디오 처리 Goroutine 시작
	var wg sync.WaitGroup
	wg.Add(2)

	// 1. 오디오 처리 워커
	go func() {
		defer wg.Done()
		h.processingWorker(sess)
	}()

	// 2. 에코 전송 워커 (클라이언트로 오디오 전송)
	go func() {
		defer wg.Done()
		h.echoWorker(c, sess)
	}()

	// Phase 1: 핸드셰이크 (메타데이터 헤더 수신)
	if err := h.performHandshake(c, sess); err != nil {
		log.Printf("❌ [%s] Handshake failed: %v", sess.ID, err)
		h.sendErrorResponse(c, sess.ID, "HANDSHAKE_FAILED", err.Error())
		return
	}

	// Phase 2: 오디오 스트리밍 수신 루프
	h.receiveLoop(c, sess)

	// 처리 워커 종료 대기
	wg.Wait()
}

// performHandshake 메타데이터 헤더 수신 및 검증
func (h *AudioHandler) performHandshake(c *websocket.Conn, sess *session.Session) error {
	// 핸드셰이크 타임아웃 설정
	deadline := time.Now().Add(h.cfg.WebSocket.HandshakeTimeout)
	if err := c.SetReadDeadline(deadline); err != nil {
		return fmt.Errorf("failed to set read deadline: %w", err)
	}

	// 첫 번째 메시지 수신 (메타데이터 헤더)
	messageType, msg, err := c.ReadMessage()
	if err != nil {
		return fmt.Errorf("failed to read header: %w", err)
	}

	// 바이너리 메시지 확인
	if messageType != websocket.BinaryMessage {
		return fmt.Errorf("expected binary message, got type %d", messageType)
	}

	// 메타데이터 파싱
	metadata, err := model.ParseMetadata(msg)
	if err != nil {
		return err
	}

	// 메타데이터 유효성 검증
	if err := metadata.Validate(&h.cfg.Audio); err != nil {
		return fmt.Errorf("invalid metadata: %w", err)
	}

	// 세션에 메타데이터 저장
	sess.SetMetadata(metadata)

	log.Printf("📋 [%s] Metadata: SampleRate=%d, Channels=%d, BitsPerSample=%d",
		sess.ID, metadata.SampleRate, metadata.Channels, metadata.BitsPerSample)

	// "ready" 응답 전송
	readyResponse := fmt.Sprintf(`{"status":"ready","session_id":"%s"}`, sess.ID)

	// 응답 전송 타임아웃 설정
	if err := c.SetWriteDeadline(time.Now().Add(h.cfg.WebSocket.WriteTimeout)); err != nil {
		return fmt.Errorf("failed to set write deadline: %w", err)
	}

	if err := c.WriteMessage(websocket.TextMessage, []byte(readyResponse)); err != nil {
		return fmt.Errorf("failed to send ready response: %w", err)
	}

	// 타임아웃 해제
	if err := c.SetReadDeadline(time.Time{}); err != nil {
		return fmt.Errorf("failed to clear read deadline: %w", err)
	}

	log.Printf("✅ [%s] Handshake complete. Ready to receive audio.", sess.ID)
	return nil
}

// receiveLoop 오디오 데이터 수신 및 채널 전달
func (h *AudioHandler) receiveLoop(c *websocket.Conn, sess *session.Session) {
	for {
		// 컨텍스트 취소 확인
		select {
		case <-sess.Context().Done():
			log.Printf("ℹ️ [%s] Receive loop terminated by context", sess.ID)
			return
		default:
		}

		// 메시지 수신
		messageType, msg, err := c.ReadMessage()
		if err != nil {
			if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
				log.Printf("ℹ️ [%s] Client disconnected normally", sess.ID)
			} else if websocket.IsUnexpectedCloseError(err) {
				log.Printf("⚠️ [%s] Unexpected disconnect: %v", sess.ID, err)
			} else {
				log.Printf("❌ [%s] Read error: %v", sess.ID, err)
			}
			return
		}

		// 바이너리 메시지만 처리
		if messageType != websocket.BinaryMessage {
			log.Printf("⚠️ [%s] Ignoring non-binary message (type: %d)", sess.ID, messageType)
			continue
		}

		// 빈 메시지 무시
		if len(msg) == 0 {
			continue
		}

		// Deep Copy 수행 (fasthttp 버퍼 재사용 문제 방지)
		dataCopy := make([]byte, len(msg))
		copy(dataCopy, msg)

		// 패킷 생성
		seqNum := sess.IncrementPacketCount()
		packet := &model.AudioPacket{
			Data:      dataCopy,
			Timestamp: time.Now(),
			SeqNum:    seqNum,
		}

		// 통계 업데이트
		sess.AddAudioBytes(int64(len(dataCopy)))

		// 채널을 통해 Worker Goroutine으로 전달
		select {
		case sess.AudioPackets <- packet:
			// 성공적으로 채널에 추가됨
		default:
			// 채널 버퍼가 가득 참 - 패킷 드롭
			log.Printf("⚠️ [%s] Audio buffer full, dropping packet #%d", sess.ID, seqNum)
		}
	}
}

// processingWorker 채널에서 오디오 패킷을 받아 처리하는 워커
func (h *AudioHandler) processingWorker(sess *session.Session) {
	log.Printf("🎧 [%s] Audio processing worker started", sess.ID)

	defer func() {
		log.Printf("🎧 [%s] Audio processing worker stopped", sess.ID)
	}()

	for {
		select {
		case <-sess.Context().Done():
			// 남은 패킷 드레인
			remaining := len(sess.AudioPackets)
			if remaining > 0 {
				log.Printf("ℹ️ [%s] Draining %d remaining packets", sess.ID, remaining)
			}
			return

		case packet, ok := <-sess.AudioPackets:
			if !ok {
				return
			}

			if err := h.processPacket(sess, packet); err != nil {
				log.Printf("⚠️ [%s] Packet #%d processing error: %v",
					sess.ID, packet.SeqNum, err)
			}
		}
	}
}

// processPacket 개별 오디오 패킷 처리
func (h *AudioHandler) processPacket(sess *session.Session, packet *model.AudioPacket) error {
	metadata := sess.GetMetadata()
	if metadata == nil {
		return fmt.Errorf("metadata not available")
	}

	// 패킷 정보 계산
	sampleCount := packet.SampleCount(metadata)
	durationMs := packet.DurationMs(metadata)
	latency := packet.Latency()

	log.Printf("🎵 [%s] Packet #%d: %d bytes, %d samples, %.1fms audio, latency: %v",
		sess.ID, packet.SeqNum, len(packet.Data), sampleCount, durationMs, latency)

	// 에코: 수신한 오디오를 클라이언트로 다시 전송
	select {
	case sess.EchoPackets <- packet.Data:
		// 에코 채널에 추가됨
	default:
		log.Printf("⚠️ [%s] Echo buffer full, dropping packet #%d", sess.ID, packet.SeqNum)
	}

	return nil
}

// echoWorker 에코 패킷을 클라이언트로 전송하는 워커
func (h *AudioHandler) echoWorker(c *websocket.Conn, sess *session.Session) {
	log.Printf("📤 [%s] Echo worker started", sess.ID)

	defer func() {
		log.Printf("📤 [%s] Echo worker stopped", sess.ID)
	}()

	for {
		select {
		case <-sess.Context().Done():
			return

		case data, ok := <-sess.EchoPackets:
			if !ok {
				return
			}

			// 타임아웃 설정
			if err := c.SetWriteDeadline(time.Now().Add(h.cfg.WebSocket.WriteTimeout)); err != nil {
				log.Printf("⚠️ [%s] Failed to set write deadline: %v", sess.ID, err)
				continue
			}

			// 바이너리 데이터 전송
			if err := c.WriteMessage(websocket.BinaryMessage, data); err != nil {
				log.Printf("⚠️ [%s] Failed to send echo: %v", sess.ID, err)
				return
			}
		}
	}
}

// sendErrorResponse 에러 응답 전송
func (h *AudioHandler) sendErrorResponse(c *websocket.Conn, sessionID, code, message string) {
	response := fmt.Sprintf(`{"status":"error","code":"%s","message":"%s","session_id":"%s"}`,
		code, message, sessionID)

	_ = c.SetWriteDeadline(time.Now().Add(h.cfg.WebSocket.WriteTimeout))

	if err := c.WriteMessage(websocket.TextMessage, []byte(response)); err != nil {
		log.Printf("⚠️ [%s] Failed to send error response: %v", sessionID, err)
	}
}
