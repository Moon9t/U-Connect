package services

import (
	"errors"
	"time"

	"github.com/uconnect/backend/internal/models"
	"gorm.io/gorm"
)

var ErrNotificationNotFound = errors.New("notification not found")

type NotificationService struct {
	db *gorm.DB
}

func NewNotificationService(db *gorm.DB) *NotificationService {
	return &NotificationService{db: db}
}

func (s *NotificationService) List(userID uint) ([]models.Notification, error) {
	var notifications []models.Notification
	err := s.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&notifications).Error
	return notifications, err
}

func (s *NotificationService) MarkRead(notificationID, userID uint) error {
	now := time.Now()
	result := s.db.Model(&models.Notification{}).
		Where("id = ? AND user_id = ?", notificationID, userID).
		Update("read_at", &now)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotificationNotFound
	}
	return nil
}

func (s *NotificationService) MarkAllRead(userID uint) error {
	now := time.Now()
	return s.db.Model(&models.Notification{}).
		Where("user_id = ? AND read_at IS NULL", userID).
		Update("read_at", &now).Error
}

func (s *NotificationService) Create(notification *models.Notification) error {
	return s.db.Create(notification).Error
}
