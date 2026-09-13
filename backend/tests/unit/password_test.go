package unit

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/uconnect/backend/pkg/utils"
	"golang.org/x/crypto/bcrypt"
)

func TestPasswordHashing(t *testing.T) {
	password := "SecurePassword123!"

	// Hash password
	hash, err := utils.HashPassword(password)
	require.NoError(t, err)
	require.NotEmpty(t, hash)

	// Verify correct password -> true
	assert.True(t, utils.CheckPasswordHash(password, hash), "Checking correct password must return true")

	// Verify wrong password -> false
	assert.False(t, utils.CheckPasswordHash("WrongPassword!", hash), "Checking wrong password must return false")
	assert.False(t, utils.CheckPasswordHash("", hash), "Checking empty password against hash must return false")

	// Hash length check (bcrypt hashes are 60 characters)
	assert.Len(t, hash, 60, "Standard bcrypt hash must be 60 characters long")

	// Bcrypt cost check: must be exactly cost 14
	cost, err := bcrypt.Cost([]byte(hash))
	require.NoError(t, err)
	assert.Equal(t, 14, cost, "Bcrypt cost must be 14 as required by security specifications")
}

func TestPasswordHashEmpty(t *testing.T) {
	hash, err := utils.HashPassword("")
	assert.Error(t, err, "Hashing empty password should return error")
	assert.Empty(t, hash)
}
