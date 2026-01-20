# 기술 스택

## Frontend
- **Framework**: Next.js 16.1.1 (App Router)
- **Language**: TypeScript 5
- **UI**: React 19.2.3, TailwindCSS 4
- **화상회의**: LiveKit Components React
- **그래픽**: PixiJS 8.14.3
- **VAD**: ricky0123/vad-react (음성 활동 감지)
- **노이즈 제거**: @jitsi/rnnoise-wasm

## Backend (Go)
- **Framework**: Fiber v2.52.10
- **Language**: Go 1.25.5
- **Database**: PostgreSQL (GORM)
- **Cache**: Redis
- **Storage**: AWS S3
- **Real-time**: WebSocket, gRPC
- **Auth**: JWT, Google OAuth

### 주요 AWS SDK 사용
- `aws-sdk-go-v2/service/polly`: TTS
- `aws-sdk-go-v2/service/translate`: 번역
- `aws-sdk-go-v2/service/transcribestreaming`: STT 스트리밍
- `aws-sdk-go-v2/service/s3`: 파일 스토리지

## Python AI Server
- **Framework**: gRPC
- **STT**: faster-whisper (CTranslate2 optimized)
- **번역**: AWS Translate (boto3)
- **TTS**: AWS Polly (boto3)
- **VAD**: webrtcvad
- **GPU 지원**: PyTorch, Transformers (Qwen3-8B 선택적 사용)

## 인프라
- **화상회의 서버**: LiveKit (livekit/livekit-server)
- **컨테이너**: Docker, Docker Compose
- **배포**: AWS Amplify (amplify.yml)
