# 코드 스타일 및 컨벤션

## Frontend (TypeScript/React)

### 파일 명명
- 컴포넌트: PascalCase (`CustomVideoConference.tsx`)
- 훅: camelCase with use prefix (`useAudioWebSocket.ts`)
- 유틸리티: camelCase (`utils.ts`)

### 컴포넌트 스타일
- 함수형 컴포넌트 사용
- React 19 사용 (use client 명시)
- TailwindCSS 클래스 사용

### 디렉토리 구조
- `app/` 내에 라우트별 디렉토리
- 각 기능별 `components/`, `hooks/` 하위 디렉토리
- 재사용 컴포넌트는 루트 `components/`

## Backend (Go)

### 파일 명명
- snake_case (`voice_record.go`)
- 패키지명은 lowercase

### 코드 스타일
- Go 표준 포매팅 (gofmt)
- 에러는 명시적 처리
- 구조체 태그 사용 (`json:"field_name"`)

### 디렉토리 구조
```
internal/
├── handler/    # HTTP/WS 핸들러
├── model/      # 데이터 모델
├── service/    # 비즈니스 로직
├── auth/       # 인증
└── config/     # 설정
```

## Python

### 파일 명명
- snake_case (`room_processor.py`)
- 클래스: PascalCase

### 코드 스타일
- 클래스 기반 구조
- async/await 사용
- Type hints 권장

## gRPC/Proto

### 명명 규칙
- 메시지: PascalCase (`ChatRequest`)
- 필드: snake_case (`session_id`)
- 서비스: PascalCase (`ConversationService`)
- RPC 메서드: PascalCase (`StreamChat`)
