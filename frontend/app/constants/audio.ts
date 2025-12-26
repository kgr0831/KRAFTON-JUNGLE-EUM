// 브라우저 내장 DSP 설정
export const MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    // 에코 캔슬링 - 스피커에서 나온 소리가 마이크로 다시 들어가는 것 방지
    echoCancellation: true,
    // 노이즈 억제 - 배경 소음 제거
    noiseSuppression: true,
    // 자동 게인 컨트롤 - 음량 자동 조절
    autoGainControl: true,
    // 샘플레이트 (16kHz는 음성에 최적화)
    sampleRate: 16000,
    // 채널 수
    channelCount: 1,
  },
  video: false,
};

// 오디오 처리 설정
export const AUDIO_PROCESSING_CONFIG = {
  // 하이패스 필터 (저주파 노이즈 제거)
  highPassFrequency: 80, // Hz
  // 컴프레서 설정
  compressor: {
    threshold: -24, // dB
    knee: 30,
    ratio: 12,
    attack: 0.003, // seconds
    release: 0.25, // seconds
  },
  // 게인 설정
  gainValue: 1.2,
};

export const AUDIO_SAMPLE_RATE = parseInt(
  process.env.NEXT_PUBLIC_AUDIO_SAMPLE_RATE || "16000",
  10
);

export const SPEECH_LOG_MAX_ENTRIES = 10;

// WebSocket 서버 URL
export const WS_AUDIO_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws/audio";
