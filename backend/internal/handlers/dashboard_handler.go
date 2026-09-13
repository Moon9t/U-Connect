package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/uconnect/backend/internal/services"
	"github.com/uconnect/backend/pkg/utils"
)

// DashboardHandler handles dashboard metrics
type DashboardHandler struct {
	dashboardService *services.DashboardService
}

// NewDashboardHandler creates a new DashboardHandler instance
func NewDashboardHandler(dashboardService *services.DashboardService) *DashboardHandler {
	return &DashboardHandler{
		dashboardService: dashboardService,
	}
}

// GetStats returns aggregated dashboard metrics for complaints
// @Route GET /api/dashboard
func (h *DashboardHandler) GetStats(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	userRole := c.MustGet("userRole").(string)

	stats, err := h.dashboardService.GetDashboardStats(userID, userRole)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to compute dashboard metrics: "+err.Error())
		return
	}

	utils.Success(c, http.StatusOK, stats)
}
