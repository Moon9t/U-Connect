package services

import (
	"errors"
	"fmt"
	"strings"

	"github.com/uconnect/backend/internal/models"
	"github.com/uconnect/backend/internal/repositories"
	"github.com/uconnect/backend/pkg/utils"
	"gorm.io/gorm"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrEmailAlreadyExists = errors.New("email address is already registered")
	ErrUserNotFound       = errors.New("user not found")
	ErrInvalidRole        = errors.New("invalid role specified")
)

// RegisterRequest defines the input payload for user registration
type RegisterRequest struct {
	Name         string `json:"name" binding:"required"`
	Email        string `json:"email" binding:"required,email"`
	Password     string `json:"password" binding:"required,min=6"`
	Role         string `json:"role"`
	DepartmentID *uint  `json:"department_id"`
}

// AuthService handles business logic for authentication and user management
type AuthService struct {
	db       *gorm.DB
	userRepo repositories.UserRepoInterface
}

// NewAuthService creates a new AuthService instance
func NewAuthService(db *gorm.DB, userRepo repositories.UserRepoInterface) *AuthService {
	return &AuthService{
		db:       db,
		userRepo: userRepo,
	}
}

// Register registers a new user, hashes the password, and returns a signed JWT
func (s *AuthService) Register(req RegisterRequest) (*models.User, string, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))

	// Check email uniqueness
	existing, err := s.userRepo.FindByEmail(s.db, email)
	if err != nil {
		return nil, "", fmt.Errorf("failed to check email existence: %w", err)
	}
	if existing != nil {
		return nil, "", ErrEmailAlreadyExists
	}

	role := strings.ToLower(strings.TrimSpace(req.Role))
	if role == "" {
		role = models.RoleStudent
	}
	if role != models.RoleStudent && role != models.RoleStaff && role != models.RoleAdmin {
		return nil, "", ErrInvalidRole
	}

	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, "", fmt.Errorf("failed to hash password: %w", err)
	}

	user := &models.User{
		Name:         strings.TrimSpace(req.Name),
		Email:        email,
		PasswordHash: hashedPassword,
		Role:         role,
		DepartmentID: req.DepartmentID,
	}

	if err := s.userRepo.Create(s.db, user); err != nil {
		return nil, "", fmt.Errorf("failed to create user: %w", err)
	}

	token, err := utils.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, "", fmt.Errorf("failed to generate authentication token: %w", err)
	}

	return user, token, nil
}

// Login authenticates a user by email and password and returns a signed JWT
func (s *AuthService) Login(email, password string) (*models.User, string, error) {
	email = strings.ToLower(strings.TrimSpace(email))

	user, err := s.userRepo.FindByEmail(s.db, email)
	if err != nil {
		return nil, "", fmt.Errorf("failed to find user: %w", err)
	}
	if user == nil {
		return nil, "", ErrInvalidCredentials
	}

	if !utils.CheckPasswordHash(password, user.PasswordHash) {
		return nil, "", ErrInvalidCredentials
	}

	token, err := utils.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, "", fmt.Errorf("failed to generate token: %w", err)
	}

	return user, token, nil
}

// GetAllUsers retrieves all registered users
func (s *AuthService) GetAllUsers() ([]models.User, error) {
	return s.userRepo.FindAll(s.db)
}

// UpdateUserRole changes a user's role
func (s *AuthService) UpdateUserRole(userID uint, newRole string) error {
	newRole = strings.ToLower(strings.TrimSpace(newRole))
	if newRole != models.RoleAdmin && newRole != models.RoleStaff && newRole != models.RoleStudent {
		return ErrInvalidRole
	}
	return s.userRepo.UpdateRole(s.db, userID, newRole)
}
