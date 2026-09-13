package repositories

import (
	"errors"

	"github.com/uconnect/backend/internal/models"
	"gorm.io/gorm"
)

// DepartmentRepoInterface defines the interface for Department data access
type DepartmentRepoInterface interface {
	Create(db *gorm.DB, dept *models.Department) error
	FindAll(db *gorm.DB) ([]models.Department, error)
	FindByID(db *gorm.DB, id uint) (*models.Department, error)
	Update(db *gorm.DB, dept *models.Department) error
	Delete(db *gorm.DB, id uint) error
	ExistsByCode(db *gorm.DB, code string) (bool, error)
}

// DepartmentRepo implements DepartmentRepoInterface
type DepartmentRepo struct{}

// NewDepartmentRepo creates a new DepartmentRepo instance
func NewDepartmentRepo() *DepartmentRepo {
	return &DepartmentRepo{}
}

// Create persists a new department
func (r *DepartmentRepo) Create(db *gorm.DB, dept *models.Department) error {
	return db.Create(dept).Error
}

// FindAll retrieves all departments
func (r *DepartmentRepo) FindAll(db *gorm.DB) ([]models.Department, error) {
	var depts []models.Department
	err := db.Order("name asc").Find(&depts).Error
	return depts, err
}

// FindByID retrieves a department by ID
func (r *DepartmentRepo) FindByID(db *gorm.DB, id uint) (*models.Department, error) {
	var dept models.Department
	err := db.First(&dept, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &dept, nil
}

// Update updates an existing department
func (r *DepartmentRepo) Update(db *gorm.DB, dept *models.Department) error {
	return db.Save(dept).Error
}

// Delete removes a department by ID
func (r *DepartmentRepo) Delete(db *gorm.DB, id uint) error {
	result := db.Delete(&models.Department{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// ExistsByCode checks if a department code already exists
func (r *DepartmentRepo) ExistsByCode(db *gorm.DB, code string) (bool, error) {
	var count int64
	err := db.Model(&models.Department{}).Where("code = ?", code).Count(&count).Error
	return count > 0, err
}
