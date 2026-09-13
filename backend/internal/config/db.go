package config

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB holds the singleton database connection
var DB *gorm.DB

// LoadEnv loads environment variables from .env if present
func LoadEnv() {
	if err := godotenv.Load(); err != nil {
		// Also try loading from parent directory or current directory
		_ = godotenv.Load("../.env")
		_ = godotenv.Load("../../.env")
	}
}

// InitDB initializes and connects to the SQLite database
func InitDB(customPath ...string) (*gorm.DB, error) {
	LoadEnv()

	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "uconnect.db"
	}
	if len(customPath) > 0 && customPath[0] != "" {
		dbPath = customPath[0]
	}

	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	}

	db, err := gorm.Open(sqlite.Open(dbPath), gormConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database at %s: %w", dbPath, err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get generic database object: %w", err)
	}

	// SQLite single-file concurrency configuration: exactly 1 open connection to prevent lock conflicts
	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetMaxIdleConns(1)

	// Enable SQLite foreign key constraints
	if err := db.Exec("PRAGMA foreign_keys = ON;").Error; err != nil {
		log.Printf("warning: failed to enable foreign keys: %v", err)
	}

	DB = db
	return db, nil
}
