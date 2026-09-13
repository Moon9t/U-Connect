package models

import (
	"time"
)

// Comment represents feedback or an update added to a complaint
type Comment struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	ComplaintID uint      `gorm:"not null;index" json:"complaint_id"`
	UserID      uint      `gorm:"not null;index" json:"user_id"`
	User        *User     `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"user,omitempty"`
	Content     string    `gorm:"type:text;not null" json:"content" binding:"required"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TableName returns the table name for Comment
func (Comment) TableName() string {
	return "comments"
}
