package system

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/uconnect/backend/migrations"
	"github.com/uconnect/backend/tests/helpers"
)

func TestPerformanceWith500PlusRecords(t *testing.T) {
	db := helpers.SetupTestDB()
	router := helpers.SetupTestRouter(db)

	// Seed database with 520 complaints
	t.Log("Seeding 500+ complaints into test database...")
	seedStart := time.Now()
	err := migrations.Seed(db)
	require.NoError(t, err)
	t.Logf("Seeding completed in %v", time.Since(seedStart))

	adminToken := helpers.GetAuthToken(router, "admin@test.com", "password123")
	require.NotEmpty(t, adminToken)

	// Test 1: Measure GET /api/complaints?page=1&page_size=20 -> must complete in < 2 seconds
	t.Run("Complaints list pagination with 500+ records < 2 seconds", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/complaints?page=1&page_size=20", nil)
		req.Header.Set("Authorization", "Bearer "+adminToken)

		w := httptest.NewRecorder()

		start := time.Now()
		router.ServeHTTP(w, req)
		duration := time.Since(start)

		t.Logf("GET /api/complaints?page=1&page_size=20 took: %v", duration)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Less(t, duration, 2*time.Second, "Querying complaints list must complete in under 2 seconds")

		var resp struct {
			Data  []interface{} `json:"data"`
			Total int64         `json:"total"`
		}
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, resp.Total, int64(500), "Database must contain at least 500 complaints")
		assert.Equal(t, 20, len(resp.Data))
	})

	// Test 2: Measure GET /api/dashboard with 500+ records -> must complete in < 1 second
	t.Run("Dashboard stats with 500+ records < 1 second", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/dashboard", nil)
		req.Header.Set("Authorization", "Bearer "+adminToken)

		w := httptest.NewRecorder()

		start := time.Now()
		router.ServeHTTP(w, req)
		duration := time.Since(start)

		t.Logf("GET /api/dashboard with 500+ records took: %v", duration)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Less(t, duration, 1*time.Second, "Dashboard computation must complete in under 1 second")

		var resp struct {
			Data struct {
				TotalComplaints int64 `json:"total_complaints"`
				SLABreaches     int64 `json:"sla_breaches"`
			} `json:"data"`
		}
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, resp.Data.TotalComplaints, int64(500))
		assert.Greater(t, resp.Data.SLABreaches, int64(0), "SLA breaches should be detected")
	})
}
