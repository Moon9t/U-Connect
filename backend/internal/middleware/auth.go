package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/uconnect/backend/pkg/utils"
)

// AuthMiddleware extracts and validates Bearer JWT token from Authorization header
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			utils.Error(c, http.StatusUnauthorized, "authorization token required")
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			utils.Error(c, http.StatusUnauthorized, "invalid authorization header format. Expected 'Bearer <token>'")
			c.Abort()
			return
		}

		tokenString := strings.TrimSpace(parts[1])
		claims, err := utils.ValidateToken(tokenString)
		if err != nil {
			utils.Error(c, http.StatusUnauthorized, "invalid or expired authentication token")
			c.Abort()
			return
		}

		// Inject authenticated user details into Gin context
		c.Set("userID", claims.UserID)
		c.Set("userEmail", claims.Email)
		c.Set("userRole", claims.Role)

		c.Next()
	}
}

// RoleMiddleware restricts access to specified roles
func RoleMiddleware(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, exists := c.Get("userRole")
		if !exists {
			utils.Error(c, http.StatusUnauthorized, "unauthorized: role claim not found")
			c.Abort()
			return
		}

		userRole, ok := roleVal.(string)
		if !ok {
			utils.Error(c, http.StatusUnauthorized, "unauthorized: invalid role format")
			c.Abort()
			return
		}

		for _, allowed := range allowedRoles {
			if strings.EqualFold(userRole, allowed) {
				c.Next()
				return
			}
		}

		utils.Error(c, http.StatusForbidden, "forbidden: insufficient permissions for this operation")
		c.Abort()
	}
}
