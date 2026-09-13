package repositories

import (
	"database/sql"
	"errors"
	"time"

	"github.com/uconnect/backend/internal/models"
	"gorm.io/gorm"
)

// ComplaintFilter encapsulates query filtering and pagination parameters
type ComplaintFilter struct {
	Status       string
	Category     string
	Priority     string
	DepartmentID *uint
	SLAEscalated *bool
	UserID       *uint // Scoped to student if role is student
	Page         int
	PageSize     int
}

// ComplaintRepoInterface defines the data access contract for Complaint
type ComplaintRepoInterface interface {
	Create(db *gorm.DB, complaint *models.Complaint) error
	FindByID(db *gorm.DB, id uint) (*models.Complaint, error)
	FindAll(db *gorm.DB, filter ComplaintFilter) ([]models.Complaint, int64, error)
	UpdateStatus(db *gorm.DB, id uint, status string, resolvedAt *time.Time) error
	AddComment(db *gorm.DB, comment *models.Comment) error
	GetComments(db *gorm.DB, complaintID uint) ([]models.Comment, error)
	FindSLABreaches(db *gorm.DB) ([]models.Complaint, error)
	MarkSLAEscalated(db *gorm.DB, ids []uint) error
	CountByStatus(db *gorm.DB, userID *uint) (map[string]int64, error)
	CountByCategory(db *gorm.DB, userID *uint) (map[string]int64, error)
	CountSLABreaches(db *gorm.DB, userID *uint) (int64, error)
	AverageResolutionHours(db *gorm.DB, userID *uint) (float64, error)
}

// ComplaintRepo implements ComplaintRepoInterface
type ComplaintRepo struct{}

// NewComplaintRepo creates a new ComplaintRepo instance
func NewComplaintRepo() *ComplaintRepo {
	return &ComplaintRepo{}
}

// Create persists a new complaint
func (r *ComplaintRepo) Create(db *gorm.DB, complaint *models.Complaint) error {
	return db.Create(complaint).Error
}

// FindByID retrieves a single complaint by ID with relations
func (r *ComplaintRepo) FindByID(db *gorm.DB, id uint) (*models.Complaint, error) {
	var complaint models.Complaint
	err := db.Preload("User").
		Preload("Department").
		Preload("Comments.User").
		First(&complaint, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &complaint, nil
}

// FindAll retrieves paginated complaints matching filters
func (r *ComplaintRepo) FindAll(db *gorm.DB, filter ComplaintFilter) ([]models.Complaint, int64, error) {
	query := db.Model(&models.Complaint{})

	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}
	if filter.Category != "" {
		query = query.Where("category = ?", filter.Category)
	}
	if filter.Priority != "" {
		query = query.Where("priority = ?", filter.Priority)
	}
	if filter.DepartmentID != nil && *filter.DepartmentID > 0 {
		query = query.Where("department_id = ?", *filter.DepartmentID)
	}
	if filter.SLAEscalated != nil {
		query = query.Where("sla_escalated = ?", *filter.SLAEscalated)
	}
	if filter.UserID != nil && *filter.UserID > 0 {
		query = query.Where("user_id = ?", *filter.UserID)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	page := filter.Page
	if page < 1 {
		page = 1
	}
	pageSize := filter.PageSize
	if pageSize < 1 {
		pageSize = 20
	} else if pageSize > 100 {
		pageSize = 100
	}

	offset := (page - 1) * pageSize

	var complaints []models.Complaint
	err := query.Preload("User").
		Preload("Department").
		Order("created_at desc").
		Offset(offset).
		Limit(pageSize).
		Find(&complaints).Error

	if err != nil {
		return nil, 0, err
	}

	return complaints, total, nil
}

// UpdateStatus updates the status and optional resolved_at timestamp
func (r *ComplaintRepo) UpdateStatus(db *gorm.DB, id uint, status string, resolvedAt *time.Time) error {
	updates := map[string]interface{}{
		"status":     status,
		"updated_at": time.Now(),
	}
	if resolvedAt != nil {
		updates["resolved_at"] = resolvedAt
	} else if status == models.StatusPending || status == models.StatusInProgress {
		updates["resolved_at"] = gorm.Expr("NULL")
	}

	result := db.Model(&models.Complaint{}).Where("id = ?", id).Updates(updates)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// AddComment adds a new comment to a complaint
func (r *ComplaintRepo) AddComment(db *gorm.DB, comment *models.Comment) error {
	return db.Create(comment).Error
}

// GetComments retrieves all comments for a complaint with authors
func (r *ComplaintRepo) GetComments(db *gorm.DB, complaintID uint) ([]models.Comment, error) {
	var comments []models.Comment
	err := db.Preload("User").
		Where("complaint_id = ?", complaintID).
		Order("created_at asc").
		Find(&comments).Error
	return comments, err
}

// FindSLABreaches finds pending complaints created more than 72 hours ago that are not yet marked as escalated
func (r *ComplaintRepo) FindSLABreaches(db *gorm.DB) ([]models.Complaint, error) {
	var complaints []models.Complaint
	threshold := time.Now().Add(-models.SLADuration)
	err := db.Where("status = ? AND created_at <= ? AND sla_escalated = ?", models.StatusPending, threshold, false).
		Find(&complaints).Error
	return complaints, err
}

// MarkSLAEscalated marks a list of complaints as SLA escalated
func (r *ComplaintRepo) MarkSLAEscalated(db *gorm.DB, ids []uint) error {
	if len(ids) == 0 {
		return nil
	}
	return db.Model(&models.Complaint{}).
		Where("id IN ?", ids).
		Update("sla_escalated", true).Error
}

// CountByStatus counts complaints grouped by status
func (r *ComplaintRepo) CountByStatus(db *gorm.DB, userID *uint) (map[string]int64, error) {
	counts := map[string]int64{
		models.StatusPending:    0,
		models.StatusInProgress: 0,
		models.StatusResolved:   0,
		models.StatusClosed:     0,
	}

	type result struct {
		Status string
		Count  int64
	}

	var results []result
	query := db.Model(&models.Complaint{}).Select("status, count(*) as count")
	if userID != nil && *userID > 0 {
		query = query.Where("user_id = ?", *userID)
	}

	if err := query.Group("status").Scan(&results).Error; err != nil {
		return nil, err
	}

	for _, r := range results {
		counts[r.Status] = r.Count
	}

	return counts, nil
}

// CountByCategory counts complaints grouped by category
func (r *ComplaintRepo) CountByCategory(db *gorm.DB, userID *uint) (map[string]int64, error) {
	counts := map[string]int64{
		models.CategoryIT:             0,
		models.CategoryFacilities:     0,
		models.CategoryAcademic:       0,
		models.CategoryExamHall:       0,
		models.CategorySafety:         0,
		models.CategoryFinance:        0,
		models.CategoryStudentAffairs: 0,
	}

	type result struct {
		Category string
		Count    int64
	}

	var results []result
	query := db.Model(&models.Complaint{}).Select("category, count(*) as count")
	if userID != nil && *userID > 0 {
		query = query.Where("user_id = ?", *userID)
	}

	if err := query.Group("category").Scan(&results).Error; err != nil {
		return nil, err
	}

	for _, r := range results {
		counts[r.Category] = r.Count
	}

	return counts, nil
}

// CountSLABreaches returns total SLA breaches (pending > 72 hours OR sla_escalated is true)
func (r *ComplaintRepo) CountSLABreaches(db *gorm.DB, userID *uint) (int64, error) {
	var count int64
	threshold := time.Now().Add(-models.SLADuration)

	query := db.Model(&models.Complaint{}).
		Where("(status = ? AND created_at <= ?) OR sla_escalated = ?", models.StatusPending, threshold, true)

	if userID != nil && *userID > 0 {
		query = query.Where("user_id = ?", *userID)
	}

	err := query.Count(&count).Error
	return count, err
}

// AverageResolutionHours calculates the average resolution time in hours for resolved/closed complaints
func (r *ComplaintRepo) AverageResolutionHours(db *gorm.DB, userID *uint) (float64, error) {
	var avg sql.NullFloat64

	// SQLite expression: (julianday(resolved_at) - julianday(created_at)) * 24.0
	query := db.Model(&models.Complaint{}).
		Select("AVG((julianday(resolved_at) - julianday(created_at)) * 24.0)").
		Where("resolved_at IS NOT NULL AND (status = ? OR status = ?)", models.StatusResolved, models.StatusClosed)

	if userID != nil && *userID > 0 {
		query = query.Where("user_id = ?", *userID)
	}

	if err := query.Scan(&avg).Error; err != nil {
		return 0, err
	}

	if !avg.Valid {
		return 0.0, nil
	}

	return avg.Float64, nil
}
