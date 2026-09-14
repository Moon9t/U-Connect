package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/uconnect/backend/internal/services"
	"github.com/uconnect/backend/pkg/utils"
)

type NotificationHandler struct {
	notificationService *services.NotificationService
}

func NewNotificationHandler(notificationService *services.NotificationService) *NotificationHandler {
	return &NotificationHandler{notificationService: notificationService}
}

func (h *NotificationHandler) List(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	notifications, err := h.notificationService.List(userID)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to retrieve notifications: "+err.Error())
		return
	}
	utils.Success(c, http.StatusOK, notifications)
}

func (h *NotificationHandler) MarkRead(c *gin.Context) {
	notificationID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid notification ID")
		return
	}

	userID := c.MustGet("userID").(uint)
	err = h.notificationService.MarkRead(uint(notificationID), userID)
	if errors.Is(err, services.ErrNotificationNotFound) {
		utils.Error(c, http.StatusNotFound, "notification not found")
		return
	}
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to mark notification as read: "+err.Error())
		return
	}
	utils.Success(c, http.StatusOK, gin.H{"read": true})
}

func (h *NotificationHandler) MarkAllRead(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	if err := h.notificationService.MarkAllRead(userID); err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to mark notifications as read: "+err.Error())
		return
	}
	utils.Success(c, http.StatusOK, gin.H{"read": true})
}
