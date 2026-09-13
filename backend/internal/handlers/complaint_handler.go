package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/uconnect/backend/internal/models"
	"github.com/uconnect/backend/internal/repositories"
	"github.com/uconnect/backend/internal/services"
	"github.com/uconnect/backend/pkg/utils"
)

// ComplaintHandler handles HTTP requests for complaints
type ComplaintHandler struct {
	complaintService *services.ComplaintService
}

// NewComplaintHandler creates a new ComplaintHandler instance
func NewComplaintHandler(complaintService *services.ComplaintService) *ComplaintHandler {
	return &ComplaintHandler{
		complaintService: complaintService,
	}
}

// maskComplaintForUser implements Rule 4:
// If anonymous == true, the user object must be hidden from staff and student responses, but visible to admins.
func maskComplaintForUser(c *models.Complaint, requestingRole string) {
	if c == nil {
		return
	}
	if c.Anonymous && requestingRole != models.RoleAdmin {
		c.User = nil
		c.UserID = 0
	}
}

// Create handles submission of a new complaint
// @Route POST /api/complaints
func (h *ComplaintHandler) Create(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	userRole := c.MustGet("userRole").(string)

	var req services.CreateComplaintRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid request: "+err.Error())
		return
	}

	complaint, message, err := h.complaintService.CreateComplaint(userID, req)
	if err != nil {
		if errors.Is(err, services.ErrDepartmentNotFound) || errors.Is(err, services.ErrInvalidCategory) {
			utils.Error(c, http.StatusBadRequest, err.Error())
			return
		}
		utils.Error(c, http.StatusInternalServerError, "failed to submit complaint: "+err.Error())
		return
	}

	maskComplaintForUser(complaint, userRole)
	utils.SuccessWithMessage(c, http.StatusCreated, message, complaint)
}

// List handles listing complaints with filters and pagination
// @Route GET /api/complaints
func (h *ComplaintHandler) List(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	userRole := c.MustGet("userRole").(string)

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	var deptIDPtr *uint
	if deptStr := c.Query("department_id"); deptStr != "" {
		if val, err := strconv.ParseUint(deptStr, 10, 64); err == nil {
			uVal := uint(val)
			deptIDPtr = &uVal
		}
	}

	var slaPtr *bool
	if slaStr := c.Query("sla_escalated"); slaStr != "" {
		bVal := strings.EqualFold(slaStr, "true")
		slaPtr = &bVal
	}

	filter := repositories.ComplaintFilter{
		Status:       c.Query("status"),
		Category:     c.Query("category"),
		Priority:     c.Query("priority"),
		DepartmentID: deptIDPtr,
		SLAEscalated: slaPtr,
		Page:         page,
		PageSize:     pageSize,
	}

	complaints, total, totalPages, err := h.complaintService.ListComplaints(filter, userRole, userID)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to retrieve complaints: "+err.Error())
		return
	}

	for i := range complaints {
		maskComplaintForUser(&complaints[i], userRole)
	}

	utils.PaginatedSuccess(c, http.StatusOK, complaints, total, page, pageSize, totalPages)
}

// GetByID retrieves a single complaint
// @Route GET /api/complaints/:id
func (h *ComplaintHandler) GetByID(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid complaint ID")
		return
	}

	userID := c.MustGet("userID").(uint)
	userRole := c.MustGet("userRole").(string)

	complaint, err := h.complaintService.GetComplaint(uint(id), userID, userRole)
	if err != nil {
		if errors.Is(err, services.ErrComplaintNotFound) {
			utils.Error(c, http.StatusNotFound, "complaint not found")
			return
		}
		if errors.Is(err, services.ErrForbiddenAccess) {
			utils.Error(c, http.StatusForbidden, "forbidden: cannot access this complaint")
			return
		}
		utils.Error(c, http.StatusInternalServerError, "failed to get complaint: "+err.Error())
		return
	}

	maskComplaintForUser(complaint, userRole)
	utils.Success(c, http.StatusOK, complaint)
}

// UpdateStatus updates the status of a complaint
// @Route PUT /api/complaints/:id/status
func (h *ComplaintHandler) UpdateStatus(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid complaint ID")
		return
	}

	userRole := c.MustGet("userRole").(string)
	if userRole != models.RoleAdmin && userRole != models.RoleStaff {
		utils.Error(c, http.StatusForbidden, "forbidden: only staff and admin can update status")
		return
	}

	var req services.UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, "status field is required")
		return
	}

	complaint, err := h.complaintService.UpdateStatus(uint(id), req.Status, userRole)
	if err != nil {
		if errors.Is(err, services.ErrComplaintNotFound) {
			utils.Error(c, http.StatusNotFound, "complaint not found")
			return
		}
		if errors.Is(err, services.ErrInvalidTransition) || errors.Is(err, services.ErrInvalidStatusValue) {
			utils.Error(c, http.StatusBadRequest, err.Error())
			return
		}
		if errors.Is(err, services.ErrForbiddenAccess) {
			utils.Error(c, http.StatusForbidden, err.Error())
			return
		}
		utils.Error(c, http.StatusInternalServerError, "failed to update status: "+err.Error())
		return
	}

	maskComplaintForUser(complaint, userRole)
	utils.Success(c, http.StatusOK, complaint)
}

// AddComment adds a comment to a complaint
// @Route POST /api/complaints/:id/comments
func (h *ComplaintHandler) AddComment(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid complaint ID")
		return
	}

	userID := c.MustGet("userID").(uint)
	userRole := c.MustGet("userRole").(string)

	var req services.AddCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, "comment content is required")
		return
	}

	comment, err := h.complaintService.AddComment(uint(id), userID, userRole, req.Content)
	if err != nil {
		if errors.Is(err, services.ErrComplaintNotFound) {
			utils.Error(c, http.StatusNotFound, "complaint not found")
			return
		}
		if errors.Is(err, services.ErrForbiddenAccess) {
			utils.Error(c, http.StatusForbidden, err.Error())
			return
		}
		utils.Error(c, http.StatusInternalServerError, "failed to post comment: "+err.Error())
		return
	}

	utils.Success(c, http.StatusCreated, comment)
}

// ListComments lists comments for a complaint
// @Route GET /api/complaints/:id/comments
func (h *ComplaintHandler) ListComments(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid complaint ID")
		return
	}

	userID := c.MustGet("userID").(uint)
	userRole := c.MustGet("userRole").(string)

	comments, err := h.complaintService.GetComments(uint(id), userID, userRole)
	if err != nil {
		if errors.Is(err, services.ErrComplaintNotFound) {
			utils.Error(c, http.StatusNotFound, "complaint not found")
			return
		}
		if errors.Is(err, services.ErrForbiddenAccess) {
			utils.Error(c, http.StatusForbidden, err.Error())
			return
		}
		utils.Error(c, http.StatusInternalServerError, "failed to retrieve comments: "+err.Error())
		return
	}

	utils.Success(c, http.StatusOK, comments)
}

// ExportCSV exports filtered complaints to CSV
// @Route GET /api/complaints/export/csv
func (h *ComplaintHandler) ExportCSV(c *gin.Context) {
	userRole := c.MustGet("userRole").(string)
	if userRole != models.RoleAdmin && userRole != models.RoleStaff {
		utils.Error(c, http.StatusForbidden, "forbidden: only staff and admin can export complaints")
		return
	}

	var deptIDPtr *uint
	if deptStr := c.Query("department_id"); deptStr != "" {
		if val, err := strconv.ParseUint(deptStr, 10, 64); err == nil {
			uVal := uint(val)
			deptIDPtr = &uVal
		}
	}

	var slaPtr *bool
	if slaStr := c.Query("sla_escalated"); slaStr != "" {
		bVal := strings.EqualFold(slaStr, "true")
		slaPtr = &bVal
	}

	filter := repositories.ComplaintFilter{
		Status:       c.Query("status"),
		Category:     c.Query("category"),
		Priority:     c.Query("priority"),
		DepartmentID: deptIDPtr,
		SLAEscalated: slaPtr,
	}

	csvData, err := h.complaintService.ExportCSV(filter)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to generate CSV export: "+err.Error())
		return
	}

	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Disposition", "attachment; filename=complaints.csv")
	c.Data(http.StatusOK, "text/csv", csvData)
}
