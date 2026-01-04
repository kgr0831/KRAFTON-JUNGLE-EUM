# 코드베이스 구조

```
KRAFTON-JUNGLE-EUM/
├── frontend/                    # Next.js 프론트엔드
│   ├── app/                     # App Router 페이지
│   │   ├── landing/             # 랜딩 페이지 섹션들
│   │   ├── workspace/[id]/      # 워크스페이스 페이지
│   │   │   ├── components/      # 워크스페이스 컴포넌트
│   │   │   │   └── storage/     # 파일 스토리지 기능
│   │   │   └── settings/        # 설정 페이지
│   │   ├── hooks/               # 커스텀 훅
│   │   │   ├── useAudioWebSocket.ts
│   │   │   ├── useLiveKitTranslation.ts
│   │   │   └── useVoiceParticipantsWebSocket.ts
│   │   └── lib/                 # 유틸리티
│   │       ├── api.ts           # API 클라이언트
│   │       ├── auth-context.tsx # 인증 컨텍스트
│   │       └── config.ts        # 설정
│   └── components/
│       └── video/               # 화상회의 컴포넌트
│           ├── whiteboard/      # 화이트보드
│           ├── CustomVideoConference.tsx
│           └── SubtitleOverlay.tsx  # 자막 오버레이
│
├── backend/                     # Go 백엔드
│   ├── cmd/
│   │   └── server/main.go       # 서버 진입점
│   ├── internal/
│   │   ├── handler/             # HTTP/WebSocket 핸들러
│   │   │   ├── audio.go         # 오디오 처리
│   │   │   ├── meeting.go       # 회의 관리
│   │   │   ├── chat_ws.go       # 채팅 WebSocket
│   │   │   └── whiteboard.go    # 화이트보드
│   │   ├── auth/                # 인증 (JWT, Google OAuth)
│   │   ├── ai/                  # AI 서버 gRPC 클라이언트
│   │   ├── aws/                 # AWS 서비스 래퍼
│   │   │   ├── translate.go
│   │   │   ├── polly.go
│   │   │   └── transcribe.go
│   │   ├── model/               # 데이터 모델
│   │   ├── database/            # DB 연결
│   │   ├── cache/               # Redis 캐시
│   │   ├── storage/             # S3 스토리지
│   │   └── server/server.go     # 서버 설정
│   ├── pb/                      # 생성된 protobuf 코드
│   └── proto/                   # Proto 정의 (사용 안함, 루트에 있음)
│
├── python-server/               # Python AI 서버
│   ├── server.py                # gRPC 서버 메인
│   ├── services/
│   │   └── conversation.py      # 대화 서비스 구현
│   ├── audio/                   # 오디오 처리
│   ├── language/                # 언어 처리
│   ├── session/                 # 세션 관리
│   └── config/                  # 설정
│
├── proto/
│   └── conversation.proto       # gRPC 서비스 정의
│
└── docker-compose.yml           # LiveKit 서버 설정
```

## 주요 파일 역할

### Frontend 핵심
- `app/hooks/useLiveKitTranslation.ts`: LiveKit + 번역 통합
- `components/video/SubtitleOverlay.tsx`: 실시간 자막 표시
- `components/video/whiteboard/`: 협업 화이트보드

### Backend 핵심
- `internal/handler/audio.go`: 오디오 스트리밍 처리
- `internal/ai/client.go`: Python AI 서버 gRPC 클라이언트
- `internal/aws/pipeline.go`: STT → 번역 → TTS 파이프라인

### Python Server 핵심
- `server.py`: gRPC ConversationServicer 구현
- `services/conversation.py`: 대화 처리 로직
