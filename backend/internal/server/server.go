package server

import (
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"realtime-backend/internal/config"
	"realtime-backend/internal/handler"
)

// Server Fiber 서버 래퍼
type Server struct {
	app     *fiber.App
	cfg     *config.Config
	handler *handler.AudioHandler
}

// New 새 서버 인스턴스 생성
func New(cfg *config.Config) *Server {
	app := fiber.New(fiber.Config{
		AppName:       "Realtime Voice AI Gateway",
		ServerHeader:  "Fiber",
		StrictRouting: true,
		CaseSensitive: true,
		ReadTimeout:   cfg.Server.ReadTimeout,
		WriteTimeout:  cfg.Server.WriteTimeout,
		IdleTimeout:   cfg.Server.IdleTimeout,
		Prefork:       false, // WebSocket과 호환성 문제로 비활성화
	})

	return &Server{
		app:     app,
		cfg:     cfg,
		handler: handler.NewAudioHandler(cfg),
	}
}

// SetupMiddleware 미들웨어 설정
func (s *Server) SetupMiddleware() {
	// 패닉 복구
	s.app.Use(recover.New(recover.Config{
		EnableStackTrace: true,
	}))

	// 로깅
	s.app.Use(logger.New(logger.Config{
		Format:     "${time} | ${status} | ${latency} | ${ip} | ${method} ${path}\n",
		TimeFormat: "2006-01-02 15:04:05",
		TimeZone:   "Asia/Seoul",
	}))

	// CORS
	s.app.Use(cors.New(cors.Config{
		AllowOrigins: s.cfg.CORS.AllowOrigins,
		AllowHeaders: s.cfg.CORS.AllowHeaders,
	}))
}

// SetupRoutes 라우트 설정
func (s *Server) SetupRoutes() {
	// 헬스체크 엔드포인트
	s.app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":    "ok",
			"timestamp": time.Now().Unix(),
		})
	})

	// WebSocket 업그레이드 체크 미들웨어
	s.app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	// WebSocket 오디오 스트리밍 엔드포인트
	s.app.Get("/ws/audio", websocket.New(s.handler.HandleWebSocket, websocket.Config{
		ReadBufferSize:  s.cfg.WebSocket.ReadBufferSize,
		WriteBufferSize: s.cfg.WebSocket.WriteBufferSize,
	}))
}

// Start 서버 시작 (Graceful Shutdown 지원)
func (s *Server) Start() error {
	// Graceful Shutdown 설정
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-quit
		log.Println("🛑 Shutting down server...")
		if err := s.app.ShutdownWithTimeout(30 * time.Second); err != nil {
			log.Fatalf("Server shutdown error: %v", err)
		}
	}()

	log.Printf("🚀 Realtime Voice AI Gateway starting on %s", s.cfg.Server.Port)
	log.Printf("📡 WebSocket endpoint: ws://localhost%s/ws/audio", s.cfg.Server.Port)

	return s.app.Listen(s.cfg.Server.Port)
}

// Shutdown 서버 종료
func (s *Server) Shutdown() error {
	return s.app.ShutdownWithTimeout(30 * time.Second)
}
