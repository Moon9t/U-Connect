package utils

import (
	"errors"
	"golang.org/x/crypto/bcrypt"
)

// DefaultCost is fixed to 14 as required by system specifications
const DefaultCost = 14

// HashPassword hashes the plain text password using bcrypt at cost 14
func HashPassword(password string) (string, error) {
	if len(password) == 0 {
		return "", errors.New("password cannot be empty")
	}
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), DefaultCost)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// CheckPasswordHash verifies a plain text password against a bcrypt hash
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
