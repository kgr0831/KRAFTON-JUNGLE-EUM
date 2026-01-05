package storage

import (
	"context"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"

	appconfig "realtime-backend/internal/config"
)

// S3Service S3 스토리지 서비스
type S3Service struct {
	client        *s3.Client
	presignClient *s3.PresignClient
	bucketName    string
	region        string
	presignExpiry time.Duration
}

// UploadResult 업로드 결과
type UploadResult struct {
	Key      string `json:"key"`
	URL      string `json:"url"`
	FileName string `json:"file_name"`
	FileSize int64  `json:"file_size"`
	MimeType string `json:"mime_type"`
}

// PresignedURL Presigned URL 정보
type PresignedURL struct {
	URL       string `json:"url"`
	Key       string `json:"key"`
	ExpiresAt string `json:"expires_at"`
}

// NewS3Service S3 서비스 생성
func NewS3Service(cfg *appconfig.S3Config) (*S3Service, error) {
	if cfg.BucketName == "" || cfg.AccessKeyID == "" || cfg.SecretAccessKey == "" {
		return nil, fmt.Errorf("S3 configuration is incomplete")
	}

	// AWS 설정
	awsCfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion(cfg.Region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			cfg.AccessKeyID,
			cfg.SecretAccessKey,
			"",
		)),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	client := s3.NewFromConfig(awsCfg)
	presignClient := s3.NewPresignClient(client)

	return &S3Service{
		client:        client,
		presignClient: presignClient,
		bucketName:    cfg.BucketName,
		region:        cfg.Region,
		presignExpiry: cfg.PresignExpiry,
	}, nil
}

// GenerateUploadURL 파일 업로드용 Presigned URL 생성
func (s *S3Service) GenerateUploadURL(workspaceID int64, fileName, contentType string) (*PresignedURL, error) {
	// 파일 키 생성: workspaces/{workspace_id}/{uuid}/{filename}
	key := fmt.Sprintf("workspaces/%d/%s/%s", workspaceID, uuid.New().String(), sanitizeFileName(fileName))

	expiresAt := time.Now().Add(s.presignExpiry)

	presignResult, err := s.presignClient.PresignPutObject(context.TODO(), &s3.PutObjectInput{
		Bucket:      aws.String(s.bucketName),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = s.presignExpiry
	})
	if err != nil {
		return nil, fmt.Errorf("failed to generate presigned URL: %w", err)
	}

	return &PresignedURL{
		URL:       presignResult.URL,
		Key:       key,
		ExpiresAt: expiresAt.Format(time.RFC3339),
	}, nil
}

// GetFileURL 파일 다운로드용 Presigned URL 생성 (비공개 버킷용)
func (s *S3Service) GetFileURL(key string) (string, error) {
	presignResult, err := s.presignClient.PresignGetObject(context.TODO(), &s3.GetObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(key),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = s.presignExpiry
	})
	if err != nil {
		return "", fmt.Errorf("failed to generate download URL: %w", err)
	}

	return presignResult.URL, nil
}

// GetPublicURL 퍼블릭 URL 반환 (퍼블릭 버킷용)
func (s *S3Service) GetPublicURL(key string) string {
	return fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", s.bucketName, s.region, key)
}

// UploadFile 파일 직접 업로드 (서버 사이드)
func (s *S3Service) UploadFile(workspaceID int64, fileName, contentType string, reader io.Reader, size int64) (*UploadResult, error) {
	key := fmt.Sprintf("workspaces/%d/%s/%s", workspaceID, uuid.New().String(), sanitizeFileName(fileName))

	_, err := s.client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket:        aws.String(s.bucketName),
		Key:           aws.String(key),
		Body:          reader,
		ContentType:   aws.String(contentType),
		ContentLength: aws.Int64(size),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to upload file: %w", err)
	}

	return &UploadResult{
		Key:      key,
		URL:      s.GetPublicURL(key),
		FileName: fileName,
		FileSize: size,
		MimeType: contentType,
	}, nil
}

// DeleteFile 파일 삭제
func (s *S3Service) DeleteFile(key string) error {
	_, err := s.client.DeleteObject(context.TODO(), &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(key),
	})
	if err != nil {
		return fmt.Errorf("failed to delete file: %w", err)
	}
	return nil
}

// DeleteFiles 여러 파일 삭제
func (s *S3Service) DeleteFiles(keys []string) error {
	for _, key := range keys {
		if err := s.DeleteFile(key); err != nil {
			return err
		}
	}
	return nil
}

// 파일명 정리 (안전한 문자만 유지)
func sanitizeFileName(name string) string {
	// 경로 구분자 제거
	name = filepath.Base(name)

	// 공백을 언더스코어로 변환
	name = strings.ReplaceAll(name, " ", "_")

	// 위험한 문자 제거
	invalidChars := []string{"<", ">", ":", "\"", "/", "\\", "|", "?", "*"}
	for _, char := range invalidChars {
		name = strings.ReplaceAll(name, char, "")
	}

	// 길이 제한
	if len(name) > 200 {
		ext := filepath.Ext(name)
		name = name[:200-len(ext)] + ext
	}

	return name
}
