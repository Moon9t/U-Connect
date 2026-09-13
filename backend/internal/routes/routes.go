package routes

import (
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/uconnect/backend/internal/handlers"
	"github.com/uconnect/backend/internal/middleware"
	"github.com/uconnect/backend/internal/models"
)

// SetupRouter initializes the Gin router with all middleware and routes
func SetupRouter(
	authHandler *handlers.AuthHandler,
	complaintHandler *handlers.ComplaintHandler,
	dashboardHandler *handlers.DashboardHandler,
	adminHandler *handlers.AdminHandler,
) *gin.Engine {
	router := gin.New()
	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	// Configure CORS
	corsOrigins := os.Getenv("ALLOWED_ORIGINS")
	var origins []string
	if corsOrigins != "" {
		for _, o := range strings.Split(corsOrigins, ",") {
			trimmed := strings.TrimSpace(o)
			if trimmed != "" {
				origins = append(origins, trimmed)
			}
		}
	}
	if len(origins) == 0 {
		origins = []string{"http://localhost:3000", "http://localhost:8080", "http://127.0.0.1:8080"}
	}

	corsConfig := cors.Config{
		AllowOrigins:     origins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization", "Accept", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length", "Content-Disposition"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
	router.Use(cors.New(corsConfig))

	// Health Check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "u-connect-backend",
			"time":    time.Now().UTC().Format(time.RFC3339),
		})
	})

	api := router.Group("/api")
	{
		// Public Auth Endpoints
		authGroup := api.Group("/auth")
		{
			authGroup.POST("/register", authHandler.Register)
			authGroup.POST("/login", authHandler.Login)
		}

		// Authenticated Routes
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware())
		{
			// Complaints - All authenticated users (scoped by role in handler/service)
			// Place specific sub-routes before :id route
			protected.GET("/complaints/export/csv", middleware.RoleMiddleware(models.RoleAdmin, models.RoleStaff), complaintHandler.ExportCSV)
			protected.POST("/complaints", complaintHandler.Create)
			protected.GET("/complaints", complaintHandler.List)
			protected.GET("/complaints/:id", complaintHandler.GetByID)
			protected.PUT("/complaints/:id/status", middleware.RoleMiddleware(models.RoleAdmin, models.RoleStaff), complaintHandler.UpdateStatus)
			protected.POST("/complaints/:id/comments", complaintHandler.AddComment)
			protected.GET("/complaints/:id/comments", complaintHandler.ListComments)

			// Dashboard - All authenticated users (scoped by role)
			protected.GET("/dashboard", dashboardHandler.GetStats)

			// Departments - All authenticated users
			protected.GET("/departments", adminHandler.ListDepartments)

			// Admin Only Endpoints
			admin := protected.Group("/admin")
			admin.Use(middleware.RoleMiddleware(models.RoleAdmin))
			{
				admin.GET("/users", adminHandler.ListUsers)
				admin.PUT("/users/:id/role", adminHandler.UpdateUserRole)
				admin.POST("/departments", adminHandler.CreateDepartment)
				admin.PUT("/departments/:id", adminHandler.UpdateDepartment)
				admin.DELETE("/departments/:id", adminHandler.DeleteDepartment)
			}
		}
	}

	return router
}
