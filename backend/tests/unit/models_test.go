package unit

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/uconnect/backend/internal/models"
)

func TestApplyAutoEscalation(t *testing.T) {
	tests := []struct {
		name             string
		category         string
		description      string
		expectedPriority string
	}{
		{
			name:             "Exam Hall category auto-escalates to high",
			category:         models.CategoryExamHall,
			description:      "There are not enough desks in the hall.",
			expectedPriority: models.PriorityHigh,
		},
		{
			name:             "Safety category auto-escalates to high",
			category:         models.CategorySafety,
			description:      "Spill on the stairs near library.",
			expectedPriority: models.PriorityHigh,
		},
		{
			name:             "Description with 'urgent' triggers critical override",
			category:         models.CategoryIT,
			description:      "This is an urgent server outage affecting exams.",
			expectedPriority: models.PriorityCritical,
		},
		{
			name:             "Description with 'emergency' triggers critical override even on Exam Hall",
			category:         models.CategoryExamHall,
			description:      "Medical emergency occurred during the examination.",
			expectedPriority: models.PriorityCritical,
		},
		{
			name:             "Description with 'danger' (case-insensitive) triggers critical",
			category:         models.CategoryFacilities,
			description:      "Exposed wiring is a DANGER to students.",
			expectedPriority: models.PriorityCritical,
		},
		{
			name:             "Description with 'critical' keyword triggers critical",
			category:         models.CategoryFinance,
			description:      "A critical database error wiped transaction records.",
			expectedPriority: models.PriorityCritical,
		},
		{
			name:             "Description with 'immediate' keyword triggers critical",
			category:         models.CategoryAcademic,
			description:      "Immediate intervention needed for classroom lock.",
			expectedPriority: models.PriorityCritical,
		},
		{
			name:             "Standard IT complaint defaults to medium",
			category:         models.CategoryIT,
			description:      "WiFi is slightly slower than usual in Dormitory B.",
			expectedPriority: models.PriorityMedium,
		},
		{
			name:             "Standard Facilities complaint defaults to medium",
			category:         models.CategoryFacilities,
			description:      "Water pressure is low in the second floor restroom.",
			expectedPriority: models.PriorityMedium,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := &models.Complaint{
				Category:    tt.category,
				Description: tt.description,
			}
			c.ApplyAutoEscalation()
			assert.Equal(t, tt.expectedPriority, c.Priority)
		})
	}
}

func TestCanTransitionTo(t *testing.T) {
	allStatuses := []string{
		models.StatusPending,
		models.StatusInProgress,
		models.StatusResolved,
		models.StatusClosed,
		"invalid-status",
	}

	validTransitions := map[string]map[string]bool{
		models.StatusPending: {
			models.StatusInProgress: true,
			models.StatusResolved:   true,
			models.StatusClosed:     true,
			models.StatusPending:    false,
		},
		models.StatusInProgress: {
			models.StatusResolved:   true,
			models.StatusClosed:     true,
			models.StatusPending:    true,
			models.StatusInProgress: false,
		},
		models.StatusResolved: {
			models.StatusClosed:     true,
			models.StatusPending:    false,
			models.StatusInProgress: false,
			models.StatusResolved:   false,
		},
		models.StatusClosed: {
			models.StatusPending:    false,
			models.StatusInProgress: false,
			models.StatusResolved:   false,
			models.StatusClosed:     false,
		},
	}

	for fromStatus, targetMap := range validTransitions {
		for _, toStatus := range allStatuses {
			expected := targetMap[toStatus]
			t.Run(fromStatus+" -> "+toStatus, func(t *testing.T) {
				c := &models.Complaint{Status: fromStatus}
				can := c.CanTransitionTo(toStatus)
				assert.Equal(t, expected, can, "Transition from %s to %s should be %v", fromStatus, toStatus, expected)
			})
		}
	}
}

func TestIsSLABreached(t *testing.T) {
	now := time.Now()

	t.Run("Pending complaint created 71 hours ago is NOT breached", func(t *testing.T) {
		c := &models.Complaint{
			Status:    models.StatusPending,
			CreatedAt: now.Add(-71 * time.Hour),
		}
		assert.False(t, c.IsSLABreached())
	})

	t.Run("Pending complaint created 73 hours ago IS breached", func(t *testing.T) {
		c := &models.Complaint{
			Status:    models.StatusPending,
			CreatedAt: now.Add(-73 * time.Hour),
		}
		assert.True(t, c.IsSLABreached())
	})

	t.Run("Resolved complaint created 100 hours ago is NOT breached", func(t *testing.T) {
		c := &models.Complaint{
			Status:    models.StatusResolved,
			CreatedAt: now.Add(-100 * time.Hour),
		}
		assert.False(t, c.IsSLABreached())
	})

	t.Run("Closed complaint created 100 hours ago is NOT breached", func(t *testing.T) {
		c := &models.Complaint{
			Status:    models.StatusClosed,
			CreatedAt: now.Add(-100 * time.Hour),
		}
		assert.False(t, c.IsSLABreached())
	})

	t.Run("In-progress complaint created 80 hours ago is NOT pending SLA breached", func(t *testing.T) {
		c := &models.Complaint{
			Status:    models.StatusInProgress,
			CreatedAt: now.Add(-80 * time.Hour),
		}
		assert.False(t, c.IsSLABreached())
	})
}
