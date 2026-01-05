# KRAFTON JUNGLE EUM - 프로젝트 개요

## 프로젝트 목적
실시간 다국어 화상 회의 플랫폼. 음성을 실시간으로 STT(Speech-to-Text), 번역, TTS(Text-to-Speech)를 통해 다른 언어 사용자에게 전달하는 솔루션.

## 핵심 기능
1. **실시간 음성 번역**: 발화자의 음성을 실시간으로 번역하여 청취자에게 전달
2. **다국어 지원**: 한국어(ko), 영어(en), 일본어(ja), 중국어(zh), 독일어(de), 프랑스어(fr), 스페인어(es) 등 지원
3. **화상 회의**: LiveKit 기반 실시간 화상/음성 회의
4. **화이트보드**: 실시간 협업 화이트보드 기능
5. **워크스페이스 관리**: 팀/워크스페이스 기반 협업 환경
6. **채팅 및 알림**: 실시간 채팅 및 알림 시스템
7. **파일 스토리지**: S3 기반 파일 저장/공유

## 기술 아키텍처
```
[Frontend (Next.js)] 
        ↓ REST/WebSocket
[Backend (Go Fiber)]
        ↓ gRPC
[Python AI Server]
        ↓
[AWS Services: Translate, Polly, Transcribe]
```

### 통신 흐름
1. 클라이언트 → Go 백엔드: WebSocket으로 오디오 청크 전송
2. Go 백엔드 → Python 서버: gRPC 양방향 스트리밍
3. Python 서버: STT(faster-whisper) → 번역(AWS Translate) → TTS(AWS Polly)
4. 결과를 역순으로 전달하여 클라이언트에서 재생
