package services

import (
	"bytes"
	"encoding/csv"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/uconnect/backend/internal/models"
	"github.com/uconnect/backend/internal/repositories"
	"gorm.io/gorm"
)

var (
	ErrComplaintNotFound  = errors.New("complaint not found")
	ErrDepartmentNotFound = errors.New("department not found")
	ErrForbiddenAccess    = errors.New("access denied: unauthorized access to complaint")
	ErrInvalidTransition  = errors.New("invalid status transition")
	ErrInvalidStatusValue = errors.New("invalid status value specified")
	ErrInvalidCategory    = errors.New("invalid category specified")
)

// CreateComplaintRequest holds payload to create a new complaint
type CreateComplaintRequest struct {
	Title        string `json:"title" binding:"required"`
	Description  string `json:"description" binding:"required"`
	Category     string `json:"category" binding:"required"`
	DepartmentID uint   `json:"department_id" binding:"required"`
	Anonymous    bool   `json:"anonymous"`
}

// UpdateStatusRequest holds payload to update complaint status
type UpdateStatusRequest struct {
	Status string `json:"status" binding:"required"`
}

// AddCommentRequest holds payload to add a comment
type AddCommentRequest struct {
	Content string `json:"content" binding:"required"`
}

// ComplaintService handles complaint lifecycle and business rules
type ComplaintService struct {
	db            *gorm.DB
	complaintRepo repositories.ComplaintRepoInterface
	deptRepo      repositories.DepartmentRepoInterface
}

// NewComplaintService creates a new ComplaintService
func NewComplaintService(
	db *gorm.DB,
	complaintRepo repositories.ComplaintRepoInterface,
	deptRepo repositories.DepartmentRepoInterface,
) *ComplaintService {
	return &ComplaintService{
		db:            db,
		complaintRepo: complaintRepo,
		deptRepo:      deptRepo,
	}
}

// CreateComplaint validates, auto-escalates, persists complaint, and returns response message
func (s *ComplaintService) CreateComplaint(
	userID uint,
	req CreateComplaintRequest,
) (*models.Complaint, string, error) {
	// Validate category
	validCategories := map[string]bool{
		models.CategoryIT:             true,
		models.CategoryFacilities:     true,
		models.CategoryAcademic:       true,
		models.CategoryExamHall:       true,
		models.CategorySafety:         true,
		models.CategoryFinance:        true,
		models.CategoryStudentAffairs: true,
	}
	if !validCategories[req.Category] {
		return nil, "", ErrInvalidCategory
	}

	// Validate department exists
	dept, err := s.deptRepo.FindByID(s.db, req.DepartmentID)
	if err != nil {
		return nil, "", fmt.Errorf("failed to verify department: %w", err)
	}
	if dept == nil {
		return nil, "", ErrDepartmentNotFound
	}

	complaint := &models.Complaint{
		Title:        req.Title,
		Description:  req.Description,
		Category:     req.Category,
		Status:       models.StatusPending,
		Anonymous:    req.Anonymous,
		SLAEscalated: false,
		UserID:       userID,
		DepartmentID: req.DepartmentID,
	}

	// Rule 1: Auto-escalation
	complaint.ApplyAutoEscalation()

	if err := s.complaintRepo.Create(s.db, complaint); err != nil {
		return nil, "", fmt.Errorf("failed to persist complaint: %w", err)
	}

	// Fetch with relations
	created, err := s.complaintRepo.FindByID(s.db, complaint.ID)
	if err != nil {
		return complaint, "", nil
	}

	_ = s.db.Create(&models.Notification{
		UserID:             userID,
		Type:               "complaint",
		Title:              "Complaint submitted",
		Description:        fmt.Sprintf("Your complaint %q was submitted successfully.", complaint.Title),
		RelatedComplaintID: &complaint.ID,
	}).Error

	var admins []models.User
	if err := s.db.Where("role = ? AND id <> ?", models.RoleAdmin, userID).Find(&admins).Error; err == nil {
		for _, admin := range admins {
			_ = s.db.Create(&models.Notification{
				UserID:             admin.ID,
				Type:               "complaint-review",
				Title:              "New complaint requires review",
				Description:        fmt.Sprintf("Complaint %q was submitted and is ready for review.", complaint.Title),
				RelatedComplaintID: &complaint.ID,
			}).Error
		}
	}

	// Determine examiner visibility message
	var message string
	if complaint.Priority == models.PriorityCritical {
		message = "🚨 CRITICAL: Immediate action required."
	} else if complaint.Category == models.CategoryExamHall || complaint.Category == models.CategorySafety {
		message = "⚠️ HIGH PRIORITY: This complaint will be escalated immediately."
	} else {
		message = "Complaint submitted."
	}

	return created, message, nil
}

// GetComplaint retrieves a complaint while enforcing student scoping
func (s *ComplaintService) GetComplaint(id uint, requestingUserID uint, requestingRole string) (*models.Complaint, error) {
	complaint, err := s.complaintRepo.FindByID(s.db, id)
	if err != nil {
		return nil, err
	}
	if complaint == nil {
		return nil, ErrComplaintNotFound
	}

	// Rule 5: Students only see their own complaints
	if requestingRole == models.RoleStudent && complaint.UserID != requestingUserID {
		return nil, ErrForbiddenAccess
	}

	return complaint, nil
}

// ListComplaints lists complaints with role-based scoping and pagination
func (s *ComplaintService) ListComplaints(
	filter repositories.ComplaintFilter,
	requestingRole string,
	requestingUserID uint,
) ([]models.Complaint, int64, int, error) {
	// Rule 5: Scope students to only their complaints
	if requestingRole == models.RoleStudent {
		filter.UserID = &requestingUserID
	}

	complaints, total, err := s.complaintRepo.FindAll(s.db, filter)
	if err != nil {
		return nil, 0, 0, err
	}

	pageSize := filter.PageSize
	if pageSize < 1 {
		pageSize = 20
	} else if pageSize > 100 {
		pageSize = 100
	}

	totalPages := int((total + int64(pageSize) - 1) / int64(pageSize))
	if totalPages == 0 {
		totalPages = 1
	}

	return complaints, total, totalPages, nil
}

// UpdateStatus enforces status transition rules and records resolution timestamp
func (s *ComplaintService) UpdateStatus(
	complaintID uint,
	newStatus string,
	requestingRole string,
) (*models.Complaint, error) {
	if requestingRole != models.RoleAdmin && requestingRole != models.RoleStaff {
		return nil, ErrForbiddenAccess
	}

	validStatuses := map[string]bool{
		models.StatusPending:    true,
		models.StatusInProgress: true,
		models.StatusResolved:   true,
		models.StatusClosed:     true,
	}
	if !validStatuses[newStatus] {
		return nil, ErrInvalidStatusValue
	}

	complaint, err := s.complaintRepo.FindByID(s.db, complaintID)
	if err != nil {
		return nil, err
	}
	if complaint == nil {
		return nil, ErrComplaintNotFound
	}

	// Rule 2: Validate transition
	if !complaint.CanTransitionTo(newStatus) {
		return nil, fmt.Errorf("%w: cannot transition from '%s' to '%s'", ErrInvalidTransition, complaint.Status, newStatus)
	}

	var resolvedAt *time.Time
	if newStatus == models.StatusResolved || newStatus == models.StatusClosed {
		now := time.Now()
		resolvedAt = &now
	}

	if err := s.complaintRepo.UpdateStatus(s.db, complaintID, newStatus, resolvedAt); err != nil {
		return nil, fmt.Errorf("failed to update status: %w", err)
	}

	_ = s.db.Create(&models.Notification{
		UserID:             complaint.UserID,
		Type:               "status",
		Title:              "Complaint status updated",
		Description:        fmt.Sprintf("Your complaint %q is now %s.", complaint.Title, newStatus),
		RelatedComplaintID: &complaint.ID,
	}).Error

	return s.complaintRepo.FindByID(s.db, complaintID)
}

// AddComment adds a comment to a complaint respecting role permissions
func (s *ComplaintService) AddComment(
	complaintID uint,
	userID uint,
	userRole string,
	content string,
) (*models.Comment, error) {
	complaint, err := s.complaintRepo.FindByID(s.db, complaintID)
	if err != nil {
		return nil, err
	}
	if complaint == nil {
		return nil, ErrComplaintNotFound
	}

	if userRole == models.RoleStudent && complaint.UserID != userID {
		return nil, ErrForbiddenAccess
	}

	comment := &models.Comment{
		ComplaintID: complaintID,
		UserID:      userID,
		Content:     content,
	}

	if err := s.complaintRepo.AddComment(s.db, comment); err != nil {
		return nil, fmt.Errorf("failed to save comment: %w", err)
	}

	if userID != complaint.UserID {
		_ = s.db.Create(&models.Notification{
			UserID:             complaint.UserID,
			Type:               "comment",
			Title:              "New complaint comment",
			Description:        fmt.Sprintf("There is a new response on your complaint %q.", complaint.Title),
			RelatedComplaintID: &complaint.ID,
		}).Error
	}

	// Preload user for response
	comments, err := s.complaintRepo.GetComments(s.db, complaintID)
	if err == nil {
		for _, c := range comments {
			if c.ID == comment.ID {
				return &c, nil
			}
		}
	}

	return comment, nil
}

// GetComments retrieves comments for a complaint respecting role permissions
func (s *ComplaintService) GetComments(
	complaintID uint,
	userID uint,
	userRole string,
) ([]models.Comment, error) {
	complaint, err := s.complaintRepo.FindByID(s.db, complaintID)
	if err != nil {
		return nil, err
	}
	if complaint == nil {
		return nil, ErrComplaintNotFound
	}

	if userRole == models.RoleStudent && complaint.UserID != userID {
		return nil, ErrForbiddenAccess
	}

	return s.complaintRepo.GetComments(s.db, complaintID)
}

// ProcessSLABreaches marks complaints breached (>72h pending) with sla_escalated = true
func (s *ComplaintService) ProcessSLABreaches() (int, error) {
	breached, err := s.complaintRepo.FindSLABreaches(s.db)
	if err != nil {
		return 0, err
	}

	if len(breached) == 0 {
		return 0, nil
	}

	var ids []uint
	for _, c := range breached {
		ids = append(ids, c.ID)
	}

	if err := s.complaintRepo.MarkSLAEscalated(s.db, ids); err != nil {
		return 0, err
	}

	return len(ids), nil
}

// ExportCSV exports complaints matching filter into CSV formatted bytes
func (s *ComplaintService) ExportCSV(filter repositories.ComplaintFilter) ([]byte, error) {
	filter.Page = 1
	filter.PageSize = 10000

	complaints, _, err := s.complaintRepo.FindAll(s.db, filter)
	if err != nil {
		return nil, err
	}

	buf := new(bytes.Buffer)
	writer := csv.NewWriter(buf)

	headers := []string{
		"ID",
		"Title",
		"Category",
		"Priority",
		"Status",
		"SLA Escalated",
		"Department",
		"Anonymous",
		"Created At",
		"Resolved At",
	}
	if err := writer.Write(headers); err != nil {
		return nil, err
	}

	for _, c := range complaints {
		deptName := ""
		if c.Department != nil {
			deptName = c.Department.Name
		}
		resolvedStr := ""
		if c.ResolvedAt != nil {
			resolvedStr = c.ResolvedAt.Format(time.RFC3339)
		}

		record := []string{
			strconv.FormatUint(uint64(c.ID), 10),
			c.Title,
			c.Category,
			c.Priority,
			c.Status,
			strconv.FormatBool(c.SLAEscalated),
			deptName,
			strconv.FormatBool(c.Anonymous),
			c.CreatedAt.Format(time.RFC3339),
			resolvedStr,
		}
		if err := writer.Write(record); err != nil {
			return nil, err
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}
