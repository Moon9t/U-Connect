package system

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/uconnect/backend/internal/models"
	"github.com/uconnect/backend/internal/services"
	"github.com/uconnect/backend/tests/helpers"
)

func TestFullComplaintLifecycleWorkflow(t *testing.T) {
	db := helpers.SetupTestDB()
	router := helpers.SetupTestRouter(db)
	_, staffUser, _, depts := helpers.SeedTestData(db)

	// Step 1: Register a new student -> 201
	studentEmail := "e2e_student@university.edu"
	regPayload := map[string]interface{}{
		"name":          "E2E Student",
		"email":         studentEmail,
		"password":      "SecretPass123!",
		"role":          "student",
		"department_id": depts[0].ID,
	}
	regBody, _ := json.Marshal(regPayload)

	req1, _ := http.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(regBody))
	req1.Header.Set("Content-Type", "application/json")
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)
	assert.Equal(t, http.StatusCreated, w1.Code)

	// Step 2: Login as student -> get token
	loginPayload := map[string]string{
		"email":    studentEmail,
		"password": "SecretPass123!",
	}
	loginBody, _ := json.Marshal(loginPayload)
	req2, _ := http.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(loginBody))
	req2.Header.Set("Content-Type", "application/json")
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusOK, w2.Code)

	var loginResp struct {
		Data struct {
			Token string `json:"token"`
		} `json:"data"`
	}
	err := json.Unmarshal(w2.Body.Bytes(), &loginResp)
	require.NoError(t, err)
	studentToken := loginResp.Data.Token
	require.NotEmpty(t, studentToken)

	// Step 3: Submit complaint -> 201
	complaintPayload := map[string]interface{}{
		"title":         "Broken Air Conditioner in Study Hall",
		"description":   "The AC in Study Hall A has been blowing warm air.",
		"category":      models.CategoryFacilities,
		"department_id": depts[0].ID,
		"anonymous":     false,
	}
	complaintBody, _ := json.Marshal(complaintPayload)
	req3, _ := http.NewRequest(http.MethodPost, "/api/complaints", bytes.NewBuffer(complaintBody))
	req3.Header.Set("Content-Type", "application/json")
	req3.Header.Set("Authorization", "Bearer "+studentToken)
	w3 := httptest.NewRecorder()
	router.ServeHTTP(w3, req3)
	assert.Equal(t, http.StatusCreated, w3.Code)

	var complaintResp struct {
		Data models.Complaint `json:"data"`
	}
	err = json.Unmarshal(w3.Body.Bytes(), &complaintResp)
	require.NoError(t, err)
	complaintID := complaintResp.Data.ID
	assert.Equal(t, models.StatusPending, complaintResp.Data.Status)
	assert.Equal(t, models.PriorityMedium, complaintResp.Data.Priority)

	// Step 4: Login as staff -> get token
	staffToken := helpers.GetAuthToken(router, staffUser.Email, "password123")
	require.NotEmpty(t, staffToken)

	// Step 5: View complaint list -> sees student's complaint
	req5, _ := http.NewRequest(http.MethodGet, "/api/complaints", nil)
	req5.Header.Set("Authorization", "Bearer "+staffToken)
	w5 := httptest.NewRecorder()
	router.ServeHTTP(w5, req5)
	assert.Equal(t, http.StatusOK, w5.Code)

	var listResp struct {
		Data []models.Complaint `json:"data"`
	}
	json.Unmarshal(w5.Body.Bytes(), &listResp)
	found := false
	for _, c := range listResp.Data {
		if c.ID == complaintID {
			found = true
			break
		}
	}
	assert.True(t, found, "Staff should see student's submitted complaint")

	// Step 6: Update status to in-progress -> 200
	updatePayload := map[string]string{"status": models.StatusInProgress}
	updateBody, _ := json.Marshal(updatePayload)
	req6, _ := http.NewRequest(http.MethodPut, fmt.Sprintf("/api/complaints/%d/status", complaintID), bytes.NewBuffer(updateBody))
	req6.Header.Set("Content-Type", "application/json")
	req6.Header.Set("Authorization", "Bearer "+staffToken)
	w6 := httptest.NewRecorder()
	router.ServeHTTP(w6, req6)
	assert.Equal(t, http.StatusOK, w6.Code)

	// Step 7: Add a comment -> 201
	commentPayload := map[string]string{"content": "Technician dispatched to inspect the AC compressor."}
	commentBody, _ := json.Marshal(commentPayload)
	req7, _ := http.NewRequest(http.MethodPost, fmt.Sprintf("/api/complaints/%d/comments", complaintID), bytes.NewBuffer(commentBody))
	req7.Header.Set("Content-Type", "application/json")
	req7.Header.Set("Authorization", "Bearer "+staffToken)
	w7 := httptest.NewRecorder()
	router.ServeHTTP(w7, req7)
	assert.Equal(t, http.StatusCreated, w7.Code)

	// Step 8: Update status to resolved -> 200
	resolvePayload := map[string]string{"status": models.StatusResolved}
	resolveBody, _ := json.Marshal(resolvePayload)
	req8, _ := http.NewRequest(http.MethodPut, fmt.Sprintf("/api/complaints/%d/status", complaintID), bytes.NewBuffer(resolveBody))
	req8.Header.Set("Content-Type", "application/json")
	req8.Header.Set("Authorization", "Bearer "+staffToken)
	w8 := httptest.NewRecorder()
	router.ServeHTTP(w8, req8)
	assert.Equal(t, http.StatusOK, w8.Code)

	// Step 9: Verify resolved_at is set
	var resolvedComplaint models.Complaint
	err = db.First(&resolvedComplaint, complaintID).Error
	require.NoError(t, err)
	assert.Equal(t, models.StatusResolved, resolvedComplaint.Status)
	assert.NotNil(t, resolvedComplaint.ResolvedAt, "ResolvedAt timestamp must be recorded upon resolution")

	// Step 10: Verify dashboard counts updated
	req10, _ := http.NewRequest(http.MethodGet, "/api/dashboard", nil)
	req10.Header.Set("Authorization", "Bearer "+staffToken)
	w10 := httptest.NewRecorder()
	router.ServeHTTP(w10, req10)
	assert.Equal(t, http.StatusOK, w10.Code)

	var dashResp struct {
		Data services.DashboardStats `json:"data"`
	}
	json.Unmarshal(w10.Body.Bytes(), &dashResp)
	assert.Equal(t, int64(1), dashResp.Data.ResolvedComplaints)
	assert.Equal(t, int64(0), dashResp.Data.PendingComplaints)
}
