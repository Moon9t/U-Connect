package unit

import (
	"os"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/uconnect/backend/pkg/utils"
)

func TestJWTGenerationAndValidation(t *testing.T) {
	origSecret := os.Getenv("JWT_SECRET")
	os.Setenv("JWT_SECRET", "test_super_secret_signing_key_for_testing")
	defer os.Setenv("JWT_SECRET", origSecret)

	userID := uint(42)
	email := "student@university.edu"
	role := "student"

	token, err := utils.GenerateToken(userID, email, role)
	require.NoError(t, err)
	require.NotEmpty(t, token)

	claims, err := utils.ValidateToken(token)
	require.NoError(t, err)
	require.NotNil(t, claims)

	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, email, claims.Email)
	assert.Equal(t, role, claims.Role)
	assert.Equal(t, "u-connect-backend", claims.Issuer)
}

func TestJWTTamperedToken(t *testing.T) {
	origSecret := os.Getenv("JWT_SECRET")
	os.Setenv("JWT_SECRET", "test_super_secret_signing_key_for_testing")
	defer os.Setenv("JWT_SECRET", origSecret)

	token, err := utils.GenerateToken(10, "admin@university.edu", "admin")
	require.NoError(t, err)

	// Tamper token payload
	parts := strings.Split(token, ".")
	require.Len(t, parts, 3)

	tamperedToken := parts[0] + "." + parts[1] + "tampered." + parts[2]

	claims, err := utils.ValidateToken(tamperedToken)
	assert.Error(t, err, "Tampered token must fail validation")
	assert.Nil(t, claims)
}

func TestJWTExpiredToken(t *testing.T) {
	origSecret := os.Getenv("JWT_SECRET")
	os.Setenv("JWT_SECRET", "test_super_secret_signing_key_for_testing")
	defer os.Setenv("JWT_SECRET", origSecret)

	// Generate token with negative expiry (already expired)
	token, err := utils.GenerateTokenWithExpiry(15, "expired@test.com", "student", -1*time.Minute)
	require.NoError(t, err)

	claims, err := utils.ValidateToken(token)
	assert.Error(t, err, "Expired token must return an error")
	assert.Nil(t, claims)
}
