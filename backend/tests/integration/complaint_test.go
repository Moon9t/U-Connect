package integration

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/uconnect/backend/internal/models"
	"github.com/uconnect/backend/tests/helpers"
)

func TestComplaintCreationAndAutoEscalation(t *testing.T) {
	db := helpers.SetupTestDB()
	router := helpers.SetupTestRouter(db)
	_, _, _, depts := helpers.SeedTestData(db)
	studentToken := helpers.GetAuthToken(router, "student@test.com", "password123")

	t.Run("Standard complaint defaults to medium", func(t *testing.T) {
		payload := map[string]interface{}{
			"title":         "Projector bulb broken",
			"description":   "The projector bulb in room 101 needs replacement.",
			"category":      models.CategoryFacilities,
			"department_id": depts[0].ID,
		}
		body, _ := json.Marshal(payload)

		req, _ := http.NewRequest(http.MethodPost, "/api/complaints", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+studentToken)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)

		var resp struct {
			Data    models.Complaint `json:"data"`
			Message string           `json:"message"`
		}
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		require.NoError(t, err)
		assert.Equal(t, models.PriorityMedium, resp.Data.Priority)
		assert.Equal(t, "Complaint submitted.", resp.Message)
	})

	t.Run("Exam Hall category auto-escalates to high", func(t *testing.T) {
		payload := map[string]interface{}{
			"title":         "Exam Hall AC Malfunctioning",
			"description":   "Air conditioning unit in Hall B is leaking.",
			"category":      models.CategoryExamHall,
			"department_id": depts[0].ID,
		}
		body, _ := json.Marshal(payload)

		req, _ := http.NewRequest(http.MethodPost, "/api/complaints", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+studentToken)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)

		var resp struct {
			Data    models.Complaint `json:"data"`
			Message string           `json:"message"`
		}
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		require.NoError(t, err)
		assert.Equal(t, models.PriorityHigh, resp.Data.Priority)
		assert.Equal(t, "⚠️ HIGH PRIORITY: This complaint will be escalated immediately.", resp.Message)
	})

	t.Run("Urgent keyword in description triggers critical", func(t *testing.T) {
		payload := map[string]interface{}{
			"title":         "Power outage in main library",
			"description":   "This is URGENT! Entire server rack in library lost power.",
			"category":      models.CategoryIT,
			"department_id": depts[0].ID,
		}
		body, _ := json.Marshal(payload)

		req, _ := http.NewRequest(http.MethodPost, "/api/complaints", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+studentToken)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)

		var resp struct {
			Data    models.Complaint `json:"data"`
			Message string           `json:"message"`
		}
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		require.NoError(t, err)
		assert.Equal(t, models.PriorityCritical, resp.Data.Priority)
		assert.Equal(t, "🚨 CRITICAL: Immediate action required.", resp.Message)
	})
}

func TestComplaintScopingAndVisibility(t *testing.T) {
	db := helpers.SetupTestDB()
	router := helpers.SetupTestRouter(db)
	_, _, studentUser, depts := helpers.SeedTestData(db)

	// Create another student
	otherStudent := models.User{
		Name:         "Other Student",
		Email:        "other@test.com",
		PasswordHash: studentUser.PasswordHash,
		Role:         models.RoleStudent,
	}
	db.Create(&otherStudent)

	// Create complaints: 2 for studentUser, 1 for otherStudent
	c1 := models.Complaint{
		Title:        "Student 1 Complaint",
		Description:  "Normal issue",
		Category:     models.CategoryIT,
		Priority:     models.PriorityMedium,
		Status:       models.StatusPending,
		UserID:       studentUser.ID,
		DepartmentID: depts[0].ID,
	}
	c2 := models.Complaint{
		Title:        "Student 1 Complaint 2",
		Description:  "Another issue",
		Category:     models.CategoryFacilities,
		Priority:     models.PriorityLow,
		Status:       models.StatusInProgress,
		UserID:       studentUser.ID,
		DepartmentID: depts[1].ID,
	}
	c3 := models.Complaint{
		Title:        "Other Student Complaint",
		Description:  "Issue for other student",
		Category:     models.CategoryAcademic,
		Priority:     models.PriorityHigh,
		Status:       models.StatusPending,
		UserID:       otherStudent.ID,
		DepartmentID: depts[0].ID,
	}
	db.Create(&c1)
	db.Create(&c2)
	db.Create(&c3)

	studentToken := helpers.GetAuthToken(router, "student@test.com", "password123")
	staffToken := helpers.GetAuthToken(router, "staff@test.com", "password123")

	t.Run("Student only sees their own complaints", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/complaints", nil)
		req.Header.Set("Authorization", "Bearer "+studentToken)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp struct {
			Data  []models.Complaint `json:"data"`
			Total int64              `json:"total"`
		}
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		require.NoError(t, err)
		assert.Equal(t, int64(2), resp.Total)
		for _, c := range resp.Data {
			assert.Equal(t, studentUser.ID, c.UserID)
		}
	})

	t.Run("Staff sees all complaints", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/complaints", nil)
		req.Header.Set("Authorization", "Bearer "+staffToken)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp struct {
			Data  []models.Complaint `json:"data"`
			Total int64              `json:"total"`
		}
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		require.NoError(t, err)
		assert.Equal(t, int64(3), resp.Total)
	})

	t.Run("Filter by status", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/complaints?status=in-progress", nil)
		req.Header.Set("Authorization", "Bearer "+staffToken)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp struct {
			Data  []models.Complaint `json:"data"`
			Total int64              `json:"total"`
		}
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		require.NoError(t, err)
		assert.Equal(t, int64(1), resp.Total)
		assert.Equal(t, models.StatusInProgress, resp.Data[0].Status)
	})

	t.Run("Pagination metadata check", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/complaints?page=1&page_size=2", nil)
		req.Header.Set("Authorization", "Bearer "+staffToken)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp struct {
			Data       []models.Complaint `json:"data"`
			Total      int64              `json:"total"`
			Page       int                `json:"page"`
			PageSize   int                `json:"page_size"`
			TotalPages int                `json:"total_pages"`
		}
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		require.NoError(t, err)
		assert.Len(t, resp.Data, 2)
		assert.Equal(t, int64(3), resp.Total)
		assert.Equal(t, 1, resp.Page)
		assert.Equal(t, 2, resp.PageSize)
		assert.Equal(t, 2, resp.TotalPages)
	})
}

func TestComplaintStatusTransitions(t *testing.T) {
	db := helpers.SetupTestDB()
	router := helpers.SetupTestRouter(db)
	_, staffUser, studentUser, depts := helpers.SeedTestData(db)

	complaint := models.Complaint{
		Title:        "Broken door lock",
		Description:  "Door cannot be locked",
		Category:     models.CategoryFacilities,
		Priority:     models.PriorityMedium,
		Status:       models.StatusPending,
		UserID:       studentUser.ID,
		DepartmentID: depts[0].ID,
	}
	db.Create(&complaint)

	staffToken := helpers.GetAuthToken(router, staffUser.Email, "password123")
	studentToken := helpers.GetAuthToken(router, studentUser.Email, "password123")

	t.Run("Staff valid status transition (pending -> in-progress)", func(t *testing.T) {
		payload := map[string]string{"status": models.StatusInProgress}
		body, _ := json.Marshal(payload)

		url := fmt.Sprintf("/api/complaints/%d/status", complaint.ID)
		req, _ := http.NewRequest(http.MethodPut, url, bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+staffToken)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp struct {
			Data models.Complaint `json:"data"`
		}
		json.Unmarshal(w.Body.Bytes(), &resp)
		assert.Equal(t, models.StatusInProgress, resp.Data.Status)
	})

	t.Run("Staff invalid status transition (closed -> in-progress)", func(t *testing.T) {
		// Set complaint to closed
		db.Model(&complaint).Update("status", models.StatusClosed)

		payload := map[string]string{"status": models.StatusInProgress}
		body, _ := json.Marshal(payload)

		url := fmt.Sprintf("/api/complaints/%d/status", complaint.ID)
		req, _ := http.NewRequest(http.MethodPut, url, bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+staffToken)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Student cannot update status", func(t *testing.T) {
		payload := map[string]string{"status": models.StatusResolved}
		body, _ := json.Marshal(payload)

		url := fmt.Sprintf("/api/complaints/%d/status", complaint.ID)
		req, _ := http.NewRequest(http.MethodPut, url, bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+studentToken)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusForbidden, w.Code)
	})
}

func TestAnonymousComplaintUserMasking(t *testing.T) {
	db := helpers.SetupTestDB()
	router := helpers.SetupTestRouter(db)
	adminUser, staffUser, studentUser, depts := helpers.SeedTestData(db)

	anonComplaint := models.Complaint{
		Title:        "Confidential Safety Issue",
		Description:  "Reported anonymously",
		Category:     models.CategorySafety,
		Priority:     models.PriorityHigh,
		Status:       models.StatusPending,
		Anonymous:    true,
		UserID:       studentUser.ID,
		DepartmentID: depts[0].ID,
	}
	db.Create(&anonComplaint)

	adminToken := helpers.GetAuthToken(router, adminUser.Email, "password123")
	staffToken := helpers.GetAuthToken(router, staffUser.Email, "password123")

	t.Run("Staff response hides user object on anonymous complaint", func(t *testing.T) {
		url := fmt.Sprintf("/api/complaints/%d", anonComplaint.ID)
		req, _ := http.NewRequest(http.MethodGet, url, nil)
		req.Header.Set("Authorization", "Bearer "+staffToken)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp struct {
			Data models.Complaint `json:"data"`
		}
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		require.NoError(t, err)
		assert.True(t, resp.Data.Anonymous)
		assert.Nil(t, resp.Data.User, "User object must be nil in staff response for anonymous complaints")
		assert.Equal(t, uint(0), resp.Data.UserID, "UserID must be zeroed in staff response")
	})

	t.Run("Admin response reveals user object on anonymous complaint", func(t *testing.T) {
		url := fmt.Sprintf("/api/complaints/%d", anonComplaint.ID)
		req, _ := http.NewRequest(http.MethodGet, url, nil)
		req.Header.Set("Authorization", "Bearer "+adminToken)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp struct {
			Data models.Complaint `json:"data"`
		}
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		require.NoError(t, err)
		assert.True(t, resp.Data.Anonymous)
		assert.NotNil(t, resp.Data.User, "User object must be visible to admins for anonymous complaints")
		assert.Equal(t, studentUser.Email, resp.Data.User.Email)
	})
}

func TestComplaintExportCSV(t *testing.T) {
	db := helpers.SetupTestDB()
	router := helpers.SetupTestRouter(db)
	_, staffUser, studentUser, depts := helpers.SeedTestData(db)

	c := models.Complaint{
		Title:        "Lab network issue",
		Description:  "Ethernet port dead",
		Category:     models.CategoryIT,
		Priority:     models.PriorityMedium,
		Status:       models.StatusPending,
		UserID:       studentUser.ID,
		DepartmentID: depts[0].ID,
	}
	db.Create(&c)

	staffToken := helpers.GetAuthToken(router, staffUser.Email, "password123")

	req, _ := http.NewRequest(http.MethodGet, "/api/complaints/export/csv", nil)
	req.Header.Set("Authorization", "Bearer "+staffToken)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "text/csv", w.Header().Get("Content-Type"))

	body := w.Body.String()
	lines := strings.Split(strings.TrimSpace(body), "\n")
	require.GreaterOrEqual(t, len(lines), 2)

	// Check headers contain Priority column
	headerLine := lines[0]
	assert.Contains(t, headerLine, "Priority")
	assert.Contains(t, headerLine, "Category")
	assert.Contains(t, headerLine, "Status")
	assert.Contains(t, headerLine, "Title")

	// Check row content
	assert.Contains(t, lines[1], "Lab network issue")
	assert.Contains(t, lines[1], "medium")
}
