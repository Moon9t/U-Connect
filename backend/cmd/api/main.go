package main

import (
	"fmt"
	"log"
	"os"

	"github.com/uconnect/backend/internal/config"
	"github.com/uconnect/backend/internal/handlers"
	"github.com/uconnect/backend/internal/repositories"
	"github.com/uconnect/backend/internal/routes"
	"github.com/uconnect/backend/internal/services"
	"github.com/uconnect/backend/migrations"
)

func main() {
	// Initialize database connection
	db, err := config.InitDB()
	if err != nil {
		log.Fatalf("Fatal: Failed to connect to database: %v", err)
	}

	// Run auto-migrations
	if err := migrations.AutoMigrate(db); err != nil {
		log.Fatalf("Fatal: Database migration failed: %v", err)
	}

	// Seed database if requested via CLI flag or SEED=true environment variable
	shouldSeed := os.Getenv("SEED") == "true"
	for _, arg := range os.Args[1:] {
		if arg == "--seed" {
			shouldSeed = true
			break
		}
	}
	if shouldSeed {
		if err := migrations.Seed(db); err != nil {
			log.Fatalf("Fatal: Database seeding failed: %v", err)
		}
	}

	// Initialize repositories
	userRepo := repositories.NewUserRepo()
	deptRepo := repositories.NewDepartmentRepo()
	complaintRepo := repositories.NewComplaintRepo()

	// Initialize services
	authService := services.NewAuthService(db, userRepo)
	complaintService := services.NewComplaintService(db, complaintRepo, deptRepo)
	dashboardService := services.NewDashboardService(db, complaintRepo)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)
	complaintHandler := handlers.NewComplaintHandler(complaintService)
	dashboardHandler := handlers.NewDashboardHandler(dashboardService)
	adminHandler := handlers.NewAdminHandler(db, authService, deptRepo)

	// Setup routes
	router := routes.SetupRouter(
		authHandler,
		complaintHandler,
		dashboardHandler,
		adminHandler,
	)

	// Determine port
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	addr := fmt.Sprintf(":%s", port)
	log.Printf("U-Connect API Server listening on %s", addr)
	if err := router.Run(addr); err != nil {
		log.Fatalf("Fatal: Server failed to start: %v", err)
	}
}
