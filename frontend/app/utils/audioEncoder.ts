/**
 * 오디오 인코딩 유틸리티
 *
 * Float32Array (VAD 출력) → Int16Array (전송용)
 * - Float32: -1.0 ~ 1.0 범위
 * - Int16: -32768 ~ 32767 범위
 */

/**
 * Float32Array를 Int16Array로 변환
 * WebSocket 전송 시 용량 50% 절감
 */
export function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);

  for (let i = 0; i < float32.length; i++) {
    // 클리핑 (-1.0 ~ 1.0 범위로 제한)
    const sample = Math.max(-1, Math.min(1, float32[i]));
    // Int16 범위로 스케일링
    int16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  return int16;
}

/**
 * Int16Array를 Float32Array로 변환 (수신 시)
 */
export function int16ToFloat32(int16: Int16Array): Float32Array {
  const float32 = new Float32Array(int16.length);

  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
  }

  return float32;
}

/**
 * Int16Array를 ArrayBuffer로 변환 (WebSocket 전송용)
 */
export function int16ToArrayBuffer(int16: Int16Array): ArrayBuffer {
  const buffer = new ArrayBuffer(int16.byteLength);
  new Int16Array(buffer).set(int16);
  return buffer;
}

/**
 * ArrayBuffer를 Int16Array로 변환 (WebSocket 수신용)
 */
export function arrayBufferToInt16(buffer: ArrayBuffer): Int16Array {
  return new Int16Array(buffer);
}

/**
 * 오디오 메타데이터 헤더 생성
 * 첫 번째 청크에 한 번만 전송
 */
export interface AudioMetadata {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
}

export function createMetadataHeader(metadata: AudioMetadata): ArrayBuffer {
  const buffer = new ArrayBuffer(12);
  const view = new DataView(buffer);

  view.setUint32(0, metadata.sampleRate, true); // little-endian
  view.setUint16(4, metadata.channels, true);
  view.setUint16(6, metadata.bitsPerSample, true);
  view.setUint32(8, 0, true); // reserved

  return buffer;
}
