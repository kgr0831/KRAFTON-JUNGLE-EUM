package aws

import (
	"context"
	"fmt"
	"log"
	"sync"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"

	appconfig "realtime-backend/internal/config"
)

// AWSClientPool holds shared AWS clients that can be reused across rooms.
// This reduces AWS connection overhead by reusing the same clients instead of
// creating new ones for each Pipeline instance.
type AWSClientPool struct {
	Transcribe *TranscribeClient
	Translate  *TranslateClient
	Polly      *PollyClient

	awsConfig  aws.Config
	sampleRate int32

	mu       sync.RWMutex
	closed   bool
	refCount int32 // Track active pipelines using this pool
}

// AWSClientPoolConfig configuration for client pool
type AWSClientPoolConfig struct {
	SampleRate int32
}

// DefaultAWSClientPoolConfig returns default configuration
func DefaultAWSClientPoolConfig() *AWSClientPoolConfig {
	return &AWSClientPoolConfig{
		SampleRate: 16000,
	}
}

// NewAWSClientPool creates a new shared AWS client pool.
// This should be created once at RoomHub level and shared across all rooms.
func NewAWSClientPool(ctx context.Context, cfg *appconfig.Config, poolCfg *AWSClientPoolConfig) (*AWSClientPool, error) {
	if poolCfg == nil {
		poolCfg = DefaultAWSClientPoolConfig()
	}

	// Load AWS config using S3 credentials
	awsCfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion(cfg.S3.Region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			cfg.S3.AccessKeyID,
			cfg.S3.SecretAccessKey,
			"",
		)),
	)
	if err != nil {
		log.Printf("[AWSClientPool] Failed to load AWS config: %v", err)
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	pool := &AWSClientPool{
		Transcribe: NewTranscribeClient(awsCfg, poolCfg.SampleRate),
		Translate:  NewTranslateClient(awsCfg),
		Polly:      NewPollyClient(awsCfg),
		awsConfig:  awsCfg,
		sampleRate: poolCfg.SampleRate,
		closed:     false,
		refCount:   0,
	}

	log.Printf("[AWSClientPool] Created shared client pool (region=%s, sampleRate=%d)",
		cfg.S3.Region, poolCfg.SampleRate)

	return pool, nil
}

// Acquire increments the reference count when a pipeline starts using this pool
func (p *AWSClientPool) Acquire() {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.refCount++
	log.Printf("[AWSClientPool] Acquired (refCount=%d)", p.refCount)
}

// Release decrements the reference count when a pipeline stops using this pool
func (p *AWSClientPool) Release() {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.refCount--
	log.Printf("[AWSClientPool] Released (refCount=%d)", p.refCount)
}

// RefCount returns the current reference count
func (p *AWSClientPool) RefCount() int32 {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.refCount
}

// IsClosed returns whether the pool has been closed
func (p *AWSClientPool) IsClosed() bool {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.closed
}

// GetAWSConfig returns the underlying AWS config (useful for custom operations)
func (p *AWSClientPool) GetAWSConfig() aws.Config {
	return p.awsConfig
}

// GetSampleRate returns the sample rate used for transcription
func (p *AWSClientPool) GetSampleRate() int32 {
	return p.sampleRate
}

// Close shuts down the client pool.
// Note: AWS SDK clients don't need explicit cleanup, but we mark the pool as closed
// to prevent further use.
func (p *AWSClientPool) Close() error {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.closed {
		return nil
	}

	p.closed = true
	log.Printf("[AWSClientPool] Closed (final refCount=%d)", p.refCount)
	return nil
}

// Stats returns statistics about the client pool
func (p *AWSClientPool) Stats() map[string]interface{} {
	p.mu.RLock()
	defer p.mu.RUnlock()

	return map[string]interface{}{
		"closed":     p.closed,
		"refCount":   p.refCount,
		"sampleRate": p.sampleRate,
	}
}
