package integration

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/uconnect/backend/internal/models"
	"github.com/uconnect/backend/internal/services"
	"github.com/uconnect/backend/tests/helpers"
)

func TestDashboardStats(t *testing.T) {
	db := helpers.SetupTestDB()
	router := helpers.SetupTestRouter(db)
	adminUser, _, studentUser, depts := helpers.SeedTestData(db)

	now := time.Now()

	// Seed 20 complaints with known distribution
	// Categories: 7 categories
	categories := []string{
		models.CategoryIT,
		models.CategoryFacilities,
		models.CategoryAcademic,
		models.CategoryExamHall,
		models.CategorySafety,
		models.CategoryFinance,
		models.CategoryStudentAffairs,
	}

	// 5 pending (of which 2 are SLA breached > 72h)
	// 5 in-progress
	// 5 resolved (with 10h resolution time)
	// 5 closed (with 20h resolution time)
	for i := 0; i < 20; i++ {
		cat := categories[i%len(categories)]
		var status string
		var createdAt time.Time
		var resolvedAt *time.Time

		switch {
		case i < 5:
			status = models.StatusPending
			if i < 2 {
				// SLA breached
				createdAt = now.Add(-80 * time.Hour)
			} else {
				createdAt = now.Add(-10 * time.Hour)
			}
		case i < 10:
			status = models.StatusInProgress
			createdAt = now.Add(-20 * time.Hour)
		case i < 15:
			status = models.StatusResolved
			createdAt = now.Add(-30 * time.Hour)
			res := createdAt.Add(10 * time.Hour) // 10h resolution
			resolvedAt = &res
		default:
			status = models.StatusClosed
			createdAt = now.Add(-50 * time.Hour)
			res := createdAt.Add(20 * time.Hour) // 20h resolution
			resolvedAt = &res
		}

		c := models.Complaint{
			Title:        "Complaint #" + string(rune('A'+i)),
			Description:  "Detailed description of test complaint",
			Category:     cat,
			Priority:     models.PriorityMedium,
			Status:       status,
			UserID:       studentUser.ID,
			DepartmentID: depts[0].ID,
			CreatedAt:    createdAt,
			ResolvedAt:   resolvedAt,
		}
		db.Create(&c)
	}

	adminToken := helpers.GetAuthToken(router, adminUser.Email, "password123")

	req, _ := http.NewRequest(http.MethodGet, "/api/dashboard", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp struct {
		Data services.DashboardStats `json:"data"`
	}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)

	stats := resp.Data
	assert.Equal(t, int64(20), stats.TotalComplaints)
	assert.Equal(t, int64(5), stats.PendingComplaints)
	assert.Equal(t, int64(5), stats.InProgressComplaints)
	assert.Equal(t, int64(5), stats.ResolvedComplaints)
	assert.Equal(t, int64(5), stats.ClosedComplaints)

	// SLA Breaches: 2 pending complaints older than 72 hours
	assert.Equal(t, int64(2), stats.SLABreaches)

	// Average Resolution: 5 * 10h + 5 * 20h = 150h / 10 = 15.0 hours
	assert.InDelta(t, 15.0, stats.AverageResolutionHours, 0.5)

	// Category breakdown returns all 7 categories
	for _, cat := range categories {
		count, exists := stats.ByCategory[cat]
		assert.True(t, exists, "Category %s should exist in breakdown", cat)
		assert.Greater(t, count, int64(0), "Category %s should have non-zero count", cat)
	}
}
