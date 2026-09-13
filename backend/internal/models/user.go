package models

import (
	"time"
)

// Role constants
const (
	RoleAdmin   = "admin"
	RoleStaff   = "staff"
	RoleStudent = "student"
)

// User represents a system user (student, staff, or admin)
type User struct {
	ID           uint        `gorm:"primaryKey" json:"id"`
	Name         string      `gorm:"size:255;not null" json:"name" binding:"required"`
	Email        string      `gorm:"size:255;uniqueIndex;not null" json:"email" binding:"required,email"`
	PasswordHash string      `gorm:"size:255;not null" json:"-"`
	Role         string      `gorm:"size:50;not null;default:'student'" json:"role"`
	DepartmentID *uint       `gorm:"index" json:"department_id"`
	Department   *Department `gorm:"foreignKey:DepartmentID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;" json:"department,omitempty"`
	CreatedAt    time.Time   `json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`
}

// TableName returns the table name for User
func (User) TableName() string {
	return "users"
}
