package migrations

import (
	"fmt"

	"github.com/uconnect/backend/internal/models"
	"gorm.io/gorm"
)

// AutoMigrate migrates all schema models in correct dependency order
func AutoMigrate(db *gorm.DB) error {
	err := db.AutoMigrate(
		&models.Department{},
		&models.User{},
		&models.Complaint{},
		&models.Comment{},
	)
	if err != nil {
		return fmt.Errorf("auto-migration failed: %w", err)
	}

	return nil
}
