package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// BaseModel 공통 필드
type BaseModel struct {
	ID        uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CreatedAt time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// User 사용자
type User struct {
	BaseModel
	Email       string  `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	Name        string  `gorm:"type:varchar(100);not null" json:"name"`
	AvatarURL   *string `gorm:"type:text" json:"avatar_url,omitempty"`
	Provider    string  `gorm:"type:varchar(50);default:'local'" json:"provider"`
	ProviderID  *string `gorm:"type:varchar(255)" json:"provider_id,omitempty"`
	LastLoginAt *time.Time `json:"last_login_at,omitempty"`

	// Relations
	Workspaces   []WorkspaceMember `gorm:"foreignKey:UserID" json:"workspaces,omitempty"`
	Participants []Participant     `gorm:"foreignKey:UserID" json:"participants,omitempty"`
}

func (User) TableName() string {
	return "users"
}

// Workspace 워크스페이스
type Workspace struct {
	BaseModel
	Name        string  `gorm:"type:varchar(100);not null" json:"name"`
	Description *string `gorm:"type:text" json:"description,omitempty"`
	OwnerID     uuid.UUID `gorm:"type:uuid;not null" json:"owner_id"`

	// Relations
	Owner    User              `gorm:"foreignKey:OwnerID" json:"owner,omitempty"`
	Members  []WorkspaceMember `gorm:"foreignKey:WorkspaceID" json:"members,omitempty"`
	Meetings []Meeting         `gorm:"foreignKey:WorkspaceID" json:"meetings,omitempty"`
}

func (Workspace) TableName() string {
	return "workspaces"
}

// WorkspaceMember 워크스페이스 멤버
type WorkspaceMember struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	WorkspaceID uuid.UUID `gorm:"type:uuid;not null" json:"workspace_id"`
	UserID      uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	Role        string    `gorm:"type:varchar(20);default:'member'" json:"role"` // owner, admin, member
	JoinedAt    time.Time `gorm:"autoCreateTime" json:"joined_at"`

	// Relations
	Workspace Workspace `gorm:"foreignKey:WorkspaceID" json:"workspace,omitempty"`
	User      User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (WorkspaceMember) TableName() string {
	return "workspace_members"
}

// Meeting 회의
type Meeting struct {
	BaseModel
	WorkspaceID  uuid.UUID  `gorm:"type:uuid;not null" json:"workspace_id"`
	Title        string     `gorm:"type:varchar(200);not null" json:"title"`
	Description  *string    `gorm:"type:text" json:"description,omitempty"`
	HostID       uuid.UUID  `gorm:"type:uuid;not null" json:"host_id"`
	Status       string     `gorm:"type:varchar(20);default:'scheduled'" json:"status"` // scheduled, active, ended
	ScheduledAt  *time.Time `json:"scheduled_at,omitempty"`
	StartedAt    *time.Time `json:"started_at,omitempty"`
	EndedAt      *time.Time `json:"ended_at,omitempty"`
	MeetingCode  string     `gorm:"type:varchar(20);uniqueIndex" json:"meeting_code"`
	MaxParticipants int     `gorm:"default:100" json:"max_participants"`

	// Relations
	Workspace    Workspace     `gorm:"foreignKey:WorkspaceID" json:"workspace,omitempty"`
	Host         User          `gorm:"foreignKey:HostID" json:"host,omitempty"`
	Participants []Participant `gorm:"foreignKey:MeetingID" json:"participants,omitempty"`
}

func (Meeting) TableName() string {
	return "meetings"
}

// Participant 회의 참가자
type Participant struct {
	ID        uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	MeetingID uuid.UUID  `gorm:"type:uuid;not null" json:"meeting_id"`
	UserID    uuid.UUID  `gorm:"type:uuid;not null" json:"user_id"`
	Role      string     `gorm:"type:varchar(20);default:'participant'" json:"role"` // host, co-host, participant
	JoinedAt  time.Time  `gorm:"autoCreateTime" json:"joined_at"`
	LeftAt    *time.Time `json:"left_at,omitempty"`
	IsActive  bool       `gorm:"default:true" json:"is_active"`

	// Media States
	IsMuted       bool `gorm:"default:false" json:"is_muted"`
	IsVideoOff    bool `gorm:"default:false" json:"is_video_off"`
	IsScreenShare bool `gorm:"default:false" json:"is_screen_share"`

	// Relations
	Meeting Meeting `gorm:"foreignKey:MeetingID" json:"meeting,omitempty"`
	User    User    `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (Participant) TableName() string {
	return "participants"
}
