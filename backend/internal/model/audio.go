package model

import (
	"encoding/binary"
	"fmt"
	"time"

	"realtime-backend/internal/config"
)

// MetadataHeaderSize 메타데이터 헤더 크기 (bytes)
const MetadataHeaderSize = 12

// AudioMetadata 클라이언트에서 전송하는 오디오 메타데이터 헤더
// Little Endian 방식으로 인코딩됨 (총 12 bytes)
type AudioMetadata struct {
	SampleRate    uint32 // 4 bytes - 샘플레이트 (예: 16000)
	Channels      uint16 // 2 bytes - 채널 수 (예: 1 = mono)
	BitsPerSample uint16 // 2 bytes - 비트 깊이 (예: 16)
	Reserved      uint32 // 4 bytes - 예약 필드 (확장용)
}

// ParseMetadata 바이너리 데이터에서 메타데이터 파싱
func ParseMetadata(data []byte) (*AudioMetadata, error) {
	if len(data) != MetadataHeaderSize {
		return nil, fmt.Errorf("invalid header size: expected %d, got %d",
			MetadataHeaderSize, len(data))
	}

	return &AudioMetadata{
		SampleRate:    binary.LittleEndian.Uint32(data[0:4]),
		Channels:      binary.LittleEndian.Uint16(data[4:6]),
		BitsPerSample: binary.LittleEndian.Uint16(data[6:8]),
		Reserved:      binary.LittleEndian.Uint32(data[8:12]),
	}, nil
}

// Validate 메타데이터 유효성 검증
func (m *AudioMetadata) Validate(cfg *config.AudioConfig) error {
	// 샘플레이트 검증
	validRate := false
	for _, rate := range cfg.ValidSampleRates {
		if m.SampleRate == rate {
			validRate = true
			break
		}
	}
	if !validRate {
		return fmt.Errorf("unsupported sample rate: %d", m.SampleRate)
	}

	// 채널 수 검증
	if m.Channels < 1 || m.Channels > cfg.MaxChannels {
		return fmt.Errorf("invalid channel count: %d (max: %d)", m.Channels, cfg.MaxChannels)
	}

	// 비트 깊이 검증
	validDepth := false
	for _, depth := range cfg.ValidBitDepths {
		if m.BitsPerSample == depth {
			validDepth = true
			break
		}
	}
	if !validDepth {
		return fmt.Errorf("unsupported bits per sample: %d", m.BitsPerSample)
	}

	return nil
}

// BytesPerSample 샘플당 바이트 수 반환
func (m *AudioMetadata) BytesPerSample() int {
	return int(m.BitsPerSample / 8)
}

// AudioPacket 비동기 처리를 위한 오디오 패킷
type AudioPacket struct {
	Data      []byte    // 복사된 오디오 데이터 (Deep Copy)
	Timestamp time.Time // 수신 시간
	SeqNum    uint64    // 시퀀스 번호
}

// SampleCount 패킷의 샘플 수 계산
func (p *AudioPacket) SampleCount(metadata *AudioMetadata) int {
	return len(p.Data) / metadata.BytesPerSample()
}

// DurationMs 패킷의 오디오 길이 (밀리초)
func (p *AudioPacket) DurationMs(metadata *AudioMetadata) float64 {
	sampleCount := p.SampleCount(metadata)
	return float64(sampleCount) / float64(metadata.SampleRate) * 1000
}

// Latency 처리 지연 시간
func (p *AudioPacket) Latency() time.Duration {
	return time.Since(p.Timestamp)
}
