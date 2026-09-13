package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/uconnect/backend/internal/models"
	"github.com/uconnect/backend/internal/repositories"
	"github.com/uconnect/backend/internal/services"
	"github.com/uconnect/backend/pkg/utils"
	"gorm.io/gorm"
)

// UpdateRoleRequest holds payload to update user role
type UpdateRoleRequest struct {
	Role string `json:"role" binding:"required"`
}

// AdminHandler handles administration operations
type AdminHandler struct {
	db          *gorm.DB
	authService *services.AuthService
	deptRepo    repositories.DepartmentRepoInterface
}

// NewAdminHandler creates a new AdminHandler instance
func NewAdminHandler(
	db *gorm.DB,
	authService *services.AuthService,
	deptRepo repositories.DepartmentRepoInterface,
) *AdminHandler {
	return &AdminHandler{
		db:          db,
		authService: authService,
		deptRepo:    deptRepo,
	}
}

// ListUsers retrieves all registered users
// @Route GET /api/admin/users
func (h *AdminHandler) ListUsers(c *gin.Context) {
	users, err := h.authService.GetAllUsers()
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to list users: "+err.Error())
		return
	}
	utils.Success(c, http.StatusOK, users)
}

// UpdateUserRole updates a specific user's role
// @Route PUT /api/admin/users/:id/role
func (h *AdminHandler) UpdateUserRole(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid user ID")
		return
	}

	var req UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, "valid role is required")
		return
	}

	if err := h.authService.UpdateUserRole(uint(id), req.Role); err != nil {
		if errors.Is(err, services.ErrInvalidRole) {
			utils.Error(c, http.StatusBadRequest, "invalid role specified. Allowed: admin, staff, student")
			return
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			utils.Error(c, http.StatusNotFound, "user not found")
			return
		}
		utils.Error(c, http.StatusInternalServerError, "failed to update user role: "+err.Error())
		return
	}

	utils.Success(c, http.StatusOK, gin.H{"message": "user role updated successfully"})
}

// CreateDepartment registers a new department
// @Route POST /api/admin/departments
func (h *AdminHandler) CreateDepartment(c *gin.Context) {
	var dept models.Department
	if err := c.ShouldBindJSON(&dept); err != nil {
		utils.Error(c, http.StatusBadRequest, "name and code are required: "+err.Error())
		return
	}

	exists, err := h.deptRepo.ExistsByCode(h.db, dept.Code)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to check department code: "+err.Error())
		return
	}
	if exists {
		utils.Error(c, http.StatusBadRequest, "department code already exists")
		return
	}

	if err := h.deptRepo.Create(h.db, &dept); err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to create department: "+err.Error())
		return
	}

	utils.Success(c, http.StatusCreated, dept)
}

// ListDepartments lists all departments
// @Route GET /api/departments
func (h *AdminHandler) ListDepartments(c *gin.Context) {
	depts, err := h.deptRepo.FindAll(h.db)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to list departments: "+err.Error())
		return
	}
	utils.Success(c, http.StatusOK, depts)
}

// UpdateDepartment modifies an existing department
// @Route PUT /api/admin/departments/:id
func (h *AdminHandler) UpdateDepartment(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid department ID")
		return
	}

	existing, err := h.deptRepo.FindByID(h.db, uint(id))
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "database error: "+err.Error())
		return
	}
	if existing == nil {
		utils.Error(c, http.StatusNotFound, "department not found")
		return
	}

	var req models.Department
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid department data: "+err.Error())
		return
	}

	// If code changed, verify uniqueness
	if req.Code != "" && req.Code != existing.Code {
		exists, err := h.deptRepo.ExistsByCode(h.db, req.Code)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "failed to check department code: "+err.Error())
			return
		}
		if exists {
			utils.Error(c, http.StatusBadRequest, "department code already exists")
			return
		}
		existing.Code = req.Code
	}

	if req.Name != "" {
		existing.Name = req.Name
	}
	existing.Description = req.Description

	if err := h.deptRepo.Update(h.db, existing); err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to update department: "+err.Error())
		return
	}

	utils.Success(c, http.StatusOK, existing)
}

// DeleteDepartment deletes a department
// @Route DELETE /api/admin/departments/:id
func (h *AdminHandler) DeleteDepartment(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid department ID")
		return
	}

	if err := h.deptRepo.Delete(h.db, uint(id)); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			utils.Error(c, http.StatusNotFound, "department not found")
			return
		}
		utils.Error(c, http.StatusInternalServerError, "failed to delete department: "+err.Error())
		return
	}

	utils.Success(c, http.StatusOK, gin.H{"message": "department deleted successfully"})
}
