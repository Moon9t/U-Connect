package utils

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims represents the JWT claims payload
type Claims struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// GetJWTSecret retrieves the JWT secret from the environment, returning an error if missing
func GetJWTSecret() ([]byte, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return nil, errors.New("JWT_SECRET environment variable is not configured")
	}
	return []byte(secret), nil
}

// GenerateToken generates a standard JWT valid for the configured duration (default 24h)
func GenerateToken(userID uint, email, role string) (string, error) {
	hours := 24
	if envHours := os.Getenv("JWT_EXPIRATION_HOURS"); envHours != "" {
		if parsed, err := strconv.Atoi(envHours); err == nil && parsed > 0 {
			hours = parsed
		}
	}
	return GenerateTokenWithExpiry(userID, email, role, time.Duration(hours)*time.Hour)
}

// GenerateTokenWithExpiry generates a JWT with an explicit expiration duration
func GenerateTokenWithExpiry(userID uint, email, role string, expiry time.Duration) (string, error) {
	secret, err := GetJWTSecret()
	if err != nil {
		return "", err
	}

	claims := &Claims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "u-connect-backend",
			Subject:   strconv.FormatUint(uint64(userID), 10),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(secret)
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}

// ValidateToken parses and validates a JWT token string
func ValidateToken(tokenString string) (*Claims, error) {
	secret, err := GetJWTSecret()
	if err != nil {
		return nil, err
	}

	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return secret, nil
	})

	if err != nil {
		return nil, fmt.Errorf("invalid or expired token: %w", err)
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("token claims could not be validated")
	}

	return claims, nil
}
