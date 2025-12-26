export interface SpeechProbabilities {
  isSpeech: number;
  notSpeech: number;
}

export interface VADState {
  listening: boolean;
  loading: boolean;
  errored: string | false;
  userSpeaking: boolean;
}

export interface VADOptions {
  startOnLoad?: boolean;
  positiveSpeechThreshold?: number;
  negativeSpeechThreshold?: number;
  baseAssetPath?: string;
  onnxWASMBasePath?: string;
}

export interface VADCallbacks {
  onSpeechStart?: () => void;
  onSpeechEnd?: (audio: Float32Array) => void;
  onFrameProcessed?: (probabilities: SpeechProbabilities) => void;
}

export interface SpeechLogEntry {
  id: string;
  timestamp: string;
  type: "start" | "end" | "error" | "info";
  message: string;
}
