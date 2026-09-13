package services

import (
	"math"

	"github.com/uconnect/backend/internal/models"
	"github.com/uconnect/backend/internal/repositories"
	"gorm.io/gorm"
)

// DashboardStats holds summary statistics for the dashboard
type DashboardStats struct {
	TotalComplaints        int64            `json:"total_complaints"`
	PendingComplaints      int64            `json:"pending_complaints"`
	InProgressComplaints   int64            `json:"in_progress_complaints"`
	ResolvedComplaints     int64            `json:"resolved_complaints"`
	ClosedComplaints       int64            `json:"closed_complaints"`
	SLABreaches            int64            `json:"sla_breaches"`
	AverageResolutionHours float64          `json:"average_resolution_hours"`
	ByCategory             map[string]int64 `json:"by_category"`
	ByStatus               map[string]int64 `json:"by_status"`
}

// DashboardService calculates analytical metrics
type DashboardService struct {
	db            *gorm.DB
	complaintRepo repositories.ComplaintRepoInterface
}

// NewDashboardService creates a new DashboardService instance
func NewDashboardService(
	db *gorm.DB,
	complaintRepo repositories.ComplaintRepoInterface,
) *DashboardService {
	return &DashboardService{
		db:            db,
		complaintRepo: complaintRepo,
	}
}

// GetDashboardStats aggregates complaint counts, SLA breaches, and resolution metrics
func (s *DashboardService) GetDashboardStats(requestingUserID uint, requestingRole string) (*DashboardStats, error) {
	var scopeUserID *uint
	if requestingRole == models.RoleStudent {
		scopeUserID = &requestingUserID
	}

	byStatus, err := s.complaintRepo.CountByStatus(s.db, scopeUserID)
	if err != nil {
		return nil, err
	}

	byCategory, err := s.complaintRepo.CountByCategory(s.db, scopeUserID)
	if err != nil {
		return nil, err
	}

	slaBreaches, err := s.complaintRepo.CountSLABreaches(s.db, scopeUserID)
	if err != nil {
		return nil, err
	}

	avgHours, err := s.complaintRepo.AverageResolutionHours(s.db, scopeUserID)
	if err != nil {
		return nil, err
	}

	// Round to 2 decimal places
	roundedAvg := math.Round(avgHours*100) / 100

	pending := byStatus[models.StatusPending]
	inProgress := byStatus[models.StatusInProgress]
	resolved := byStatus[models.StatusResolved]
	closed := byStatus[models.StatusClosed]
	total := pending + inProgress + resolved + closed

	return &DashboardStats{
		TotalComplaints:        total,
		PendingComplaints:      pending,
		InProgressComplaints:   inProgress,
		ResolvedComplaints:     resolved,
		ClosedComplaints:       closed,
		SLABreaches:            slaBreaches,
		AverageResolutionHours: roundedAvg,
		ByCategory:             byCategory,
		ByStatus:               byStatus,
	}, nil
}
