# Build stage
FROM golang:1.21-alpine AS builder

# Install build dependencies for CGO (required by SQLite)
RUN apk add --no-cache gcc g++ musl-dev

WORKDIR /app

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Compile statically linked binary with CGO enabled
ENV CGO_ENABLED=1
RUN go build -ldflags="-s -w" -o /app/bin/server cmd/api/main.go

# Runtime stage
FROM alpine:3.19

# Install runtime dependencies
RUN apk add --no-cache ca-certificates tzdata sqlite-libs wget

WORKDIR /app

# Create directory for SQLite persistent database
RUN mkdir -p /app/data

# Copy binary from builder
COPY --from=builder /app/bin/server /app/server
COPY --from=builder /app/.env.example /app/.env

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app
USER appuser

EXPOSE 8080

ENV PORT=8080 \
    DB_PATH=/app/data/uconnect.db \
    GIN_MODE=release

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

ENTRYPOINT ["/app/server"]
