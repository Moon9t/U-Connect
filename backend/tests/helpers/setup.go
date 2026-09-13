package helpers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/uconnect/backend/internal/handlers"
	"github.com/uconnect/backend/internal/models"
	"github.com/uconnect/backend/internal/repositories"
	"github.com/uconnect/backend/internal/routes"
	"github.com/uconnect/backend/internal/services"
	"github.com/uconnect/backend/migrations"
	"github.com/uconnect/backend/pkg/utils"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var dbCounter uint64

func init() {
	gin.SetMode(gin.TestMode)
	if os.Getenv("JWT_SECRET") == "" {
		os.Setenv("JWT_SECRET", "test_jwt_secret_key_uconnect_testing_123456789")
	}
}

// SetupTestDB creates a fresh, isolated in-memory SQLite database with schema migrations
func SetupTestDB() *gorm.DB {
	id := atomic.AddUint64(&dbCounter, 1)
	dsn := fmt.Sprintf("file:memdb_%d_%d?mode=memory&cache=shared", time.Now().UnixNano(), id)

	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		panic(fmt.Sprintf("failed to open test database: %v", err))
	}

	sqlDB, err := db.DB()
	if err != nil {
		panic(fmt.Sprintf("failed to get generic sql.DB: %v", err))
	}
	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetMaxIdleConns(1)

	if err := db.Exec("PRAGMA foreign_keys = ON;").Error; err != nil {
		panic(fmt.Sprintf("failed to enable foreign keys: %v", err))
	}

	if err := migrations.AutoMigrate(db); err != nil {
		panic(fmt.Sprintf("failed to auto-migrate test database: %v", err))
	}

	return db
}

// SetupTestRouter wires the full application router for the provided DB
func SetupTestRouter(db *gorm.DB) *gin.Engine {
	userRepo := repositories.NewUserRepo()
	deptRepo := repositories.NewDepartmentRepo()
	complaintRepo := repositories.NewComplaintRepo()

	authService := services.NewAuthService(db, userRepo)
	complaintService := services.NewComplaintService(db, complaintRepo, deptRepo)
	dashboardService := services.NewDashboardService(db, complaintRepo)

	authHandler := handlers.NewAuthHandler(authService)
	complaintHandler := handlers.NewComplaintHandler(complaintService)
	dashboardHandler := handlers.NewDashboardHandler(dashboardService)
	adminHandler := handlers.NewAdminHandler(db, authService, deptRepo)

	return routes.SetupRouter(
		authHandler,
		complaintHandler,
		dashboardHandler,
		adminHandler,
	)
}

// SeedTestData inserts 1 admin, 1 staff, 1 student, and 2 departments into db
func SeedTestData(db *gorm.DB) (admin *models.User, staff *models.User, student *models.User, depts []models.Department) {
	d1 := models.Department{Name: "Computer Science", Code: "CS", Description: "Computing department"}
	d2 := models.Department{Name: "Electrical Engineering", Code: "EE", Description: "Engineering department"}
	db.Create(&d1)
	db.Create(&d2)
	depts = []models.Department{d1, d2}

	hashedPassword, _ := utils.HashPassword("password123")

	uAdmin := models.User{
		Name:         "Admin User",
		Email:        "admin@test.com",
		PasswordHash: hashedPassword,
		Role:         models.RoleAdmin,
		DepartmentID: &d1.ID,
	}
	uStaff := models.User{
		Name:         "Staff User",
		Email:        "staff@test.com",
		PasswordHash: hashedPassword,
		Role:         models.RoleStaff,
		DepartmentID: &d1.ID,
	}
	uStudent := models.User{
		Name:         "Student User",
		Email:        "student@test.com",
		PasswordHash: hashedPassword,
		Role:         models.RoleStudent,
		DepartmentID: &d2.ID,
	}

	db.Create(&uAdmin)
	db.Create(&uStaff)
	db.Create(&uStudent)

	return &uAdmin, &uStaff, &uStudent, depts
}

// GetAuthToken logs in with the given credentials and returns the Bearer JWT token
func GetAuthToken(router *gin.Engine, email, password string) string {
	payload := map[string]string{
		"email":    email,
		"password": password,
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		panic(fmt.Sprintf("GetAuthToken failed with status %d: %s", w.Code, w.Body.String()))
	}

	var resp struct {
		Data struct {
			Token string `json:"token"`
		} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		panic(fmt.Sprintf("GetAuthToken failed to parse response: %v", err))
	}

	return resp.Data.Token
}
