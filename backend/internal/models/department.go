package models

import (
	"time"
)

// Department represents an academic or administrative department
type Department struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"size:255;not null" json:"name" binding:"required"`
	Code        string    `gorm:"size:50;uniqueIndex;not null" json:"code" binding:"required"`
	Description string    `gorm:"type:text" json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TableName returns the table name for Department
func (Department) TableName() string {
	return "departments"
}
