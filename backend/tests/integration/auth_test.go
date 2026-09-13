package integration

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/uconnect/backend/internal/models"
	"github.com/uconnect/backend/tests/helpers"
)

func TestAuthRegisterSuccess(t *testing.T) {
	db := helpers.SetupTestDB()
	router := helpers.SetupTestRouter(db)

	payload := map[string]interface{}{
		"name":     "John Doe",
		"email":    "john.doe@university.edu",
		"password": "Password123!",
		"role":     "student",
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var resp struct {
		Data struct {
			User  models.User `json:"user"`
			Token string      `json:"token"`
		} `json:"data"`
		Error interface{} `json:"error"`
	}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Nil(t, resp.Error)
	assert.NotEmpty(t, resp.Data.Token)
	assert.Equal(t, "john.doe@university.edu", resp.Data.User.Email)
	assert.Equal(t, "student", resp.Data.User.Role)

	// Verify user persisted in database with hashed password
	var savedUser models.User
	err = db.Where("email = ?", "john.doe@university.edu").First(&savedUser).Error
	require.NoError(t, err)
	assert.NotEmpty(t, savedUser.PasswordHash)
	assert.NotEqual(t, "Password123!", savedUser.PasswordHash)
}

func TestAuthRegisterDuplicateEmail(t *testing.T) {
	db := helpers.SetupTestDB()
	router := helpers.SetupTestRouter(db)

	helpers.SeedTestData(db)

	payload := map[string]interface{}{
		"name":     "Duplicate Student",
		"email":    "student@test.com", // seeded email
		"password": "Password123!",
		"role":     "student",
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestAuthRegisterInvalidEmail(t *testing.T) {
	db := helpers.SetupTestDB()
	router := helpers.SetupTestRouter(db)

	payload := map[string]interface{}{
		"name":     "Bad Email",
		"email":    "not-an-email",
		"password": "Password123!",
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestAuthLoginSuccess(t *testing.T) {
	db := helpers.SetupTestDB()
	router := helpers.SetupTestRouter(db)
	helpers.SeedTestData(db)

	payload := map[string]string{
		"email":    "admin@test.com",
		"password": "password123",
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp struct {
		Data struct {
			User  models.User `json:"user"`
			Token string      `json:"token"`
		} `json:"data"`
		Error interface{} `json:"error"`
	}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Nil(t, resp.Error)
	assert.NotEmpty(t, resp.Data.Token)
	assert.Equal(t, "admin@test.com", resp.Data.User.Email)
}

func TestAuthLoginWrongCredentials(t *testing.T) {
	db := helpers.SetupTestDB()
	router := helpers.SetupTestRouter(db)
	helpers.SeedTestData(db)

	payload := map[string]string{
		"email":    "admin@test.com",
		"password": "wrongPassword!",
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestAccessProtectedWithoutToken(t *testing.T) {
	db := helpers.SetupTestDB()
	router := helpers.SetupTestRouter(db)

	req, _ := http.NewRequest(http.MethodGet, "/api/complaints", nil)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestAccessProtectedWithMalformedToken(t *testing.T) {
	db := helpers.SetupTestDB()
	router := helpers.SetupTestRouter(db)

	req, _ := http.NewRequest(http.MethodGet, "/api/complaints", nil)
	req.Header.Set("Authorization", "Bearer invalid.jwt.token")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestAccessAdminEndpointAsStudent(t *testing.T) {
	db := helpers.SetupTestDB()
	router := helpers.SetupTestRouter(db)
	helpers.SeedTestData(db)

	studentToken := helpers.GetAuthToken(router, "student@test.com", "password123")

	req, _ := http.NewRequest(http.MethodGet, "/api/admin/users", nil)
	req.Header.Set("Authorization", "Bearer "+studentToken)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}
