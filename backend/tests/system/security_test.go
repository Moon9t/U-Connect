package system

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/uconnect/backend/internal/models"
	"github.com/uconnect/backend/pkg/utils"
	"github.com/uconnect/backend/tests/helpers"
)

func TestSecurityEnforcements(t *testing.T) {
	db := helpers.SetupTestDB()
	router := helpers.SetupTestRouter(db)
	adminUser, staffUser, studentUser, depts := helpers.SeedTestData(db)

	adminToken := helpers.GetAuthToken(router, adminUser.Email, "password123")
	staffToken := helpers.GetAuthToken(router, staffUser.Email, "password123")
	studentToken := helpers.GetAuthToken(router, studentUser.Email, "password123")

	t.Run("Student cannot access /api/admin/users (403)", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/admin/users", nil)
		req.Header.Set("Authorization", "Bearer "+studentToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusForbidden, w.Code)
	})

	t.Run("Staff cannot create departments (403)", func(t *testing.T) {
		payload := map[string]string{
			"name": "Unauthorized Department",
			"code": "UNAUTH",
		}
		body, _ := json.Marshal(payload)
		req, _ := http.NewRequest(http.MethodPost, "/api/admin/departments", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+staffToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusForbidden, w.Code)
	})

	t.Run("Request without token returns 401", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/dashboard", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("Request with token for a different user's complaint returns 403 or 404", func(t *testing.T) {
		// Create complaint owned by studentUser
		c := models.Complaint{
			Title:        "Private Complaint",
			Description:  "Confidential academic issue",
			Category:     models.CategoryAcademic,
			Priority:     models.PriorityLow,
			Status:       models.StatusPending,
			UserID:       studentUser.ID,
			DepartmentID: depts[0].ID,
		}
		db.Create(&c)

		// Create another student
		otherStudent := models.User{
			Name:         "Intruder Student",
			Email:        "intruder@university.edu",
			PasswordHash: studentUser.PasswordHash,
			Role:         models.RoleStudent,
		}
		db.Create(&otherStudent)
		intruderToken := helpers.GetAuthToken(router, otherStudent.Email, "password123")

		// Intruder attempts to fetch studentUser's complaint
		req, _ := http.NewRequest(http.MethodGet, fmt.Sprintf("/api/complaints/%d", c.ID), nil)
		req.Header.Set("Authorization", "Bearer "+intruderToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.True(t, w.Code == http.StatusForbidden || w.Code == http.StatusNotFound,
			"Expected status 403 or 404, got %d", w.Code)
	})

	t.Run("Password is never returned in any JSON response", func(t *testing.T) {
		// Test login response
		loginPayload := map[string]string{
			"email":    adminUser.Email,
			"password": "password123",
		}
		body, _ := json.Marshal(loginPayload)
		req, _ := http.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.NotContains(t, w.Body.String(), "PasswordHash")
		assert.NotContains(t, w.Body.String(), "password_hash")

		// Test admin users list response
		reqAdmin, _ := http.NewRequest(http.MethodGet, "/api/admin/users", nil)
		reqAdmin.Header.Set("Authorization", "Bearer "+adminToken)
		wAdmin := httptest.NewRecorder()
		router.ServeHTTP(wAdmin, reqAdmin)
		assert.NotContains(t, wAdmin.Body.String(), "PasswordHash")
		assert.NotContains(t, wAdmin.Body.String(), "password_hash")
	})

	t.Run("JWT secret must be from env, not hardcoded", func(t *testing.T) {
		orig := os.Getenv("JWT_SECRET")
		os.Unsetenv("JWT_SECRET")
		defer os.Setenv("JWT_SECRET", orig)

		// Without JWT_SECRET in environment, token generation or validation must fail
		_, err := utils.GetJWTSecret()
		assert.Error(t, err, "GetJWTSecret must fail when JWT_SECRET environment variable is missing")

		_, err = utils.GenerateToken(1, "test@test.com", "admin")
		assert.Error(t, err, "GenerateToken must fail without JWT_SECRET in env")
	})
}
