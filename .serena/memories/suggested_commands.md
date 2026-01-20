# 개발 명령어

## Frontend (Next.js)
```bash
cd frontend

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 프로덕션 실행
npm run start

# 린트
npm run lint
```

## Backend (Go)
```bash
cd backend

# 개발 실행
go run cmd/server/main.go

# 빌드
go build -o bin/server cmd/server/main.go

# 테스트
go test ./...

# DB 체크
go run cmd/check_db/main.go
```

## Python Server
```bash
cd python-server

# 가상환경 활성화
source .venv/bin/activate

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
python server.py

# gRPC 코드 생성 (proto 파일 변경 시)
python -m grpc_tools.protoc -I../proto --python_out=./generated --grpc_python_out=./generated ../proto/conversation.proto
```

## Proto/gRPC 코드 생성

### Go (backend)
```bash
cd backend
protoc --go_out=./pb --go-grpc_out=./pb ../proto/conversation.proto
```

### Python
```bash
cd python-server
python -m grpc_tools.protoc -I../proto --python_out=./generated --grpc_python_out=./generated ../proto/conversation.proto
```

## Docker
```bash
# LiveKit 서버 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f livekit
```

## 시스템 유틸리티 (Darwin/macOS)
```bash
# Git
git status
git log --oneline -10
git diff

# 파일 탐색
ls -la
find . -name "*.go"

# 프로세스
ps aux | grep server
lsof -i :8080
```
