package repositories

import (
	"errors"

	"github.com/uconnect/backend/internal/models"
	"gorm.io/gorm"
)

// UserRepoInterface defines the interface for User data access
type UserRepoInterface interface {
	Create(db *gorm.DB, user *models.User) error
	FindByEmail(db *gorm.DB, email string) (*models.User, error)
	FindByID(db *gorm.DB, id uint) (*models.User, error)
	FindAll(db *gorm.DB) ([]models.User, error)
	UpdateRole(db *gorm.DB, id uint, role string) error
}

// UserRepo implements UserRepoInterface
type UserRepo struct{}

// NewUserRepo creates a new UserRepo instance
func NewUserRepo() *UserRepo {
	return &UserRepo{}
}

// Create persists a new user into the database
func (r *UserRepo) Create(db *gorm.DB, user *models.User) error {
	return db.Create(user).Error
}

// FindByEmail retrieves a user by email address
func (r *UserRepo) FindByEmail(db *gorm.DB, email string) (*models.User, error) {
	var user models.User
	err := db.Preload("Department").Where("email = ?", email).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

// FindByID retrieves a user by primary key ID
func (r *UserRepo) FindByID(db *gorm.DB, id uint) (*models.User, error) {
	var user models.User
	err := db.Preload("Department").First(&user, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

// FindAll retrieves all users ordered by creation date descending
func (r *UserRepo) FindAll(db *gorm.DB) ([]models.User, error) {
	var users []models.User
	err := db.Preload("Department").Order("created_at desc").Find(&users).Error
	return users, err
}

// UpdateRole updates a user's role
func (r *UserRepo) UpdateRole(db *gorm.DB, id uint, role string) error {
	result := db.Model(&models.User{}).Where("id = ?", id).Update("role", role)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
