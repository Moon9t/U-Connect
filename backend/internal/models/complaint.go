package models

import (
	"strings"
	"time"
)

// Complaint Categories
const (
	CategoryIT             = "IT"
	CategoryFacilities     = "Facilities"
	CategoryAcademic       = "Academic"
	CategoryExamHall       = "Exam Hall"
	CategorySafety         = "Safety"
	CategoryFinance        = "Finance"
	CategoryStudentAffairs = "Student Affairs"
)

// Complaint Priorities
const (
	PriorityLow      = "low"
	PriorityMedium   = "medium"
	PriorityHigh     = "high"
	PriorityCritical = "critical"
)

// Complaint Statuses
const (
	StatusPending    = "pending"
	StatusInProgress = "in-progress"
	StatusResolved   = "resolved"
	StatusClosed     = "closed"
)

// SLA Duration target is 72 hours
const SLADuration = 72 * time.Hour

// Complaint represents a grievance submitted by a student
type Complaint struct {
	ID           uint        `gorm:"primaryKey" json:"id"`
	Title        string      `gorm:"size:255;not null" json:"title" binding:"required"`
	Description  string      `gorm:"type:text;not null" json:"description" binding:"required"`
	Category     string      `gorm:"size:100;not null" json:"category" binding:"required"`
	Priority     string      `gorm:"size:50;not null" json:"priority"`
	Status       string      `gorm:"size:50;not null;default:'pending'" json:"status"`
	Anonymous    bool        `gorm:"default:false" json:"anonymous"`
	SLAEscalated bool        `gorm:"default:false;index" json:"sla_escalated"`
	UserID       uint        `gorm:"not null;index" json:"user_id"`
	User         *User       `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"user,omitempty"`
	DepartmentID uint        `gorm:"not null;index" json:"department_id" binding:"required"`
	Department   *Department `gorm:"foreignKey:DepartmentID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"department,omitempty"`
	ResolvedAt   *time.Time  `json:"resolved_at"`
	CreatedAt    time.Time   `gorm:"index" json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`
	Comments     []Comment   `gorm:"foreignKey:ComplaintID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"comments,omitempty"`
}

// TableName returns the table name for Complaint
func (Complaint) TableName() string {
	return "complaints"
}

// ApplyAutoEscalation implements Rule 1:
// - If description contains any of: emergency, urgent, critical, immediate, danger (case-insensitive) -> critical
// - If category is Exam Hall OR Safety -> high
// - Otherwise -> medium
func (c *Complaint) ApplyAutoEscalation() {
	descLower := strings.ToLower(c.Description)
	criticalKeywords := []string{"emergency", "urgent", "critical", "immediate", "danger"}

	for _, kw := range criticalKeywords {
		if strings.Contains(descLower, kw) {
			c.Priority = PriorityCritical
			return
		}
	}

	if c.Category == CategoryExamHall || c.Category == CategorySafety {
		c.Priority = PriorityHigh
		return
	}

	c.Priority = PriorityMedium
}

// CanTransitionTo implements Rule 2:
// - pending     -> in-progress, resolved, closed
// - in-progress -> resolved, closed, pending
// - resolved    -> closed
// - closed      -> terminal, no transitions
func (c *Complaint) CanTransitionTo(newStatus string) bool {
	switch c.Status {
	case StatusPending:
		return newStatus == StatusInProgress || newStatus == StatusResolved || newStatus == StatusClosed
	case StatusInProgress:
		return newStatus == StatusResolved || newStatus == StatusClosed || newStatus == StatusPending
	case StatusResolved:
		return newStatus == StatusClosed
	case StatusClosed:
		return false
	default:
		return false
	}
}

// IsSLABreached implements Rule 3:
// SLA target = 72 hours. Breached if status == pending AND now - created_at > 72h
func (c *Complaint) IsSLABreached() bool {
	if c.Status != StatusPending {
		return false
	}
	return time.Since(c.CreatedAt) > SLADuration
}

// HoursOpen returns the number of hours the complaint was or has been open
func (c *Complaint) HoursOpen() float64 {
	if c.ResolvedAt != nil {
		return c.ResolvedAt.Sub(c.CreatedAt).Hours()
	}
	return time.Since(c.CreatedAt).Hours()
}
