package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/uconnect/backend/internal/services"
	"github.com/uconnect/backend/pkg/utils"
)

// LoginRequest defines credentials for logging in
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// AuthHandler processes HTTP requests for authentication
type AuthHandler struct {
	authService *services.AuthService
}

// NewAuthHandler creates a new AuthHandler
func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

// Register handles user registration
// @Route POST /api/auth/register
func (h *AuthHandler) Register(c *gin.Context) {
	var req services.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid registration data: "+err.Error())
		return
	}

	user, token, err := h.authService.Register(req)
	if err != nil {
		if errors.Is(err, services.ErrEmailAlreadyExists) || errors.Is(err, services.ErrInvalidRole) {
			utils.Error(c, http.StatusBadRequest, err.Error())
			return
		}
		utils.Error(c, http.StatusInternalServerError, "failed to register user: "+err.Error())
		return
	}

	utils.Success(c, http.StatusCreated, gin.H{
		"user":  user,
		"token": token,
	})
}

// Login handles user login and issuance of JWT
// @Route POST /api/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, "email and password are required")
		return
	}

	user, token, err := h.authService.Login(req.Email, req.Password)
	if err != nil {
		if errors.Is(err, services.ErrInvalidCredentials) {
			utils.Error(c, http.StatusUnauthorized, "invalid email or password")
			return
		}
		utils.Error(c, http.StatusInternalServerError, "login failed: "+err.Error())
		return
	}

	utils.Success(c, http.StatusOK, gin.H{
		"user":  user,
		"token": token,
	})
}
