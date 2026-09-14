package models

import "time"

// Notification represents an in-app notification for a user.
type Notification struct {
	ID                 uint       `gorm:"primaryKey" json:"id"`
	UserID             uint       `gorm:"not null;index" json:"user_id"`
	Type               string     `gorm:"size:50;not null" json:"type"`
	Title              string     `gorm:"size:255;not null" json:"title"`
	Description        string     `gorm:"type:text;not null" json:"description"`
	RelatedComplaintID *uint      `gorm:"index" json:"related_complaint_id,omitempty"`
	ReadAt             *time.Time `json:"read_at,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

func (Notification) TableName() string {
	return "notifications"
}
