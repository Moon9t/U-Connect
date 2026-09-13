package utils

import (
	"github.com/gin-gonic/gin"
)

// Response represents the standard JSON API response structure
type Response struct {
	Data       interface{} `json:"data"`
	Message    string      `json:"message,omitempty"`
	Error      interface{} `json:"error"`
	Total      *int64      `json:"total,omitempty"`
	Page       *int        `json:"page,omitempty"`
	PageSize   *int        `json:"page_size,omitempty"`
	TotalPages *int        `json:"total_pages,omitempty"`
}

// Success sends a standard success response with HTTP status code and data
func Success(c *gin.Context, code int, data interface{}) {
	c.JSON(code, gin.H{
		"data":  data,
		"error": nil,
	})
}

// SuccessWithMessage sends a success response with an informational/alert message
func SuccessWithMessage(c *gin.Context, code int, message string, data interface{}) {
	c.JSON(code, gin.H{
		"data":    data,
		"message": message,
		"error":   nil,
	})
}

// PaginatedSuccess sends a paginated list response with pagination metadata
func PaginatedSuccess(c *gin.Context, code int, data interface{}, total int64, page, pageSize, totalPages int) {
	c.JSON(code, gin.H{
		"data":        data,
		"total":       total,
		"page":        page,
		"page_size":   pageSize,
		"total_pages": totalPages,
		"error":       nil,
	})
}

// Error sends an error response with HTTP status code and error message
func Error(c *gin.Context, code int, message string) {
	c.JSON(code, gin.H{
		"data":  nil,
		"error": message,
	})
}
