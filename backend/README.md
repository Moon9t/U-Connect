# U-Connect REST API

U-Connect is a production-grade University Complaint Management System built with **Go 1.21**, **Gin**, **GORM**, and **SQLite**. It enables students to submit academic and campus grievances, staff to track and resolve them, and administrators to oversee departmental operations with robust role-based access control and automated SLA escalation.

---

## Key Features

- **Automated Escalation (Rule 1)**: Auto-escalates Exam Hall and Safety complaints to `high` priority; overrides with `critical` when urgent emergency keywords are detected.
- **Strict Transition State Machine (Rule 2)**: Enforces complaint transitions (`pending` → `in-progress` → `resolved` → `closed`), disallowing arbitrary modifications once closed.
- **SLA Breach Monitoring (Rule 3)**: Automatic tracking of complaints pending beyond 72 hours with batch escalation.
- **Anonymous Complaint Masking (Rule 4)**: Masks student identity from staff responses while maintaining administrative oversight.
- **Role-Based Data Access (Rule 5)**: Enforces student ownership boundaries while granting staff and admins institutional visibility.
- **Real-Time Analytics & CSV Export**: Provides instant breakdown of resolution speeds, category distributions, SLA breach metrics, and compliant CSV reports.
- **Sub-Second Performance**: Benchmarked with 500+ records queryable in milliseconds (< 2s SLA requirement).

---

## Tech Stack

| Dependency | Version | Purpose |
|---|---|---|
| `github.com/gin-gonic/gin` | `v1.9.1` | High-performance HTTP web framework |
| `github.com/gin-contrib/cors` | `v1.5.0` | Cross-Origin Resource Sharing middleware |
| `gorm.io/gorm` | `v1.25.5` | Idiomatic Go ORM |
| `gorm.io/driver/sqlite` | `v1.5.4` | SQLite driver (configured with `SetMaxOpenConns(1)`) |
| `github.com/golang-jwt/jwt/v5` | `v5.2.0` | JWT authentication and claim validation |
| `golang.org/x/crypto` | `v0.18.0` | Bcrypt password hashing (fixed cost 14) |
| `github.com/joho/godotenv` | `v1.5.1` | Environment variable loader |
| `github.com/bxcodec/faker/v3` | `v3.8.1` | Realistic data generator for seeding |
| `github.com/stretchr/testify` | `v1.8.4` | Unit, integration, and system test assertions |

---

## Directory Structure

```
backend/
├── cmd/api/main.go               # Application entrypoint
├── internal/
│   ├── config/db.go             # Database connection & single-concurrency setup
│   ├── models/                  # Domain entities & business logic methods
│   │   ├── user.go
│   │   ├── department.go
│   │   ├── complaint.go
│   │   └── comment.go
│   ├── repositories/            # Data access layer
│   │   ├── user_repo.go
│   │   ├── department_repo.go
│   │   └── complaint_repo.go
│   ├── services/                # Business logic & workflow orchestrators
│   │   ├── auth_service.go
│   │   ├── complaint_service.go
│   │   └── dashboard_service.go
│   ├── handlers/                # HTTP route controllers
│   │   ├── auth_handler.go
│   │   ├── complaint_handler.go
│   │   ├── dashboard_handler.go
│   │   └── admin_handler.go
│   ├── middleware/auth.go       # JWT verification & RBAC authorization
│   └── routes/routes.go         # Route definitions & CORS configuration
├── pkg/utils/
│   ├── jwt.go                   # Token creation & validation
│   ├── password.go              # Bcrypt cost 14 hashing
│   └── response.go              # Standard JSON response wrappers
├── migrations/
│   ├── auto_migrate.go          # Schema auto-migration
│   └── seeder.go                # 520 complaints, 20 users, 5 departments
├── tests/
│   ├── helpers/setup.go         # Test database & authentication test helpers
│   ├── unit/                    # Domain models, password & JWT unit tests
│   ├── integration/             # Auth, complaints, and dashboard integration tests
│   └── system/                  # Workflow, security, and performance system tests
├── .env                         # Environment settings
├── .env.example                 # Example environment template
├── .gitignore
├── Dockerfile                   # Multi-stage production container build
├── docker-compose.yml           # Single-command deployment stack
├── go.mod
├── go.sum
└── README.md
```

---

## API Endpoints

### Public Endpoints

| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/health` | Server health check and UTC timestamp | Public |
| `POST` | `/api/auth/register` | Register a new user | Public |
| `POST` | `/api/auth/login` | Authenticate user & receive JWT token | Public |

### Protected Endpoints (Requires `Authorization: Bearer <TOKEN>`)

| Method | Path | Description | Allowed Roles |
|---|---|---|---|
| `POST` | `/api/complaints` | Submit a complaint (auto-escalated) | `student`, `staff`, `admin` |
| `GET` | `/api/complaints` | List complaints (with filtering & pagination) | `student` (scoped), `staff`, `admin` |
| `GET` | `/api/complaints/:id` | Get details of a single complaint | `student` (scoped), `staff`, `admin` |
| `PUT` | `/api/complaints/:id/status` | Update complaint status | `staff`, `admin` |
| `POST` | `/api/complaints/:id/comments` | Add comment to a complaint | `student` (scoped), `staff`, `admin` |
| `GET` | `/api/complaints/:id/comments` | List comments for a complaint | `student` (scoped), `staff`, `admin` |
| `GET` | `/api/complaints/export/csv` | Download CSV export of complaints | `staff`, `admin` |
| `GET` | `/api/dashboard` | Aggregated analytics & SLA statistics | `student` (scoped), `staff`, `admin` |
| `GET` | `/api/departments` | List all departments | `student`, `staff`, `admin` |

### Admin Endpoints (Requires `admin` role)

| Method | Path | Description | Allowed Roles |
|---|---|---|---|
| `GET` | `/api/admin/users` | List all registered users | `admin` |
| `PUT` | `/api/admin/users/:id/role` | Change a user's role (`admin`, `staff`, `student`) | `admin` |
| `POST` | `/api/admin/departments` | Create a new department | `admin` |
| `PUT` | `/api/admin/departments/:id` | Update department name or code | `admin` |
| `DELETE` | `/api/admin/departments/:id` | Delete a department | `admin` |

---

## Query Parameters for `GET /api/complaints`

- `status` (`pending`, `in-progress`, `resolved`, `closed`)
- `category` (`IT`, `Facilities`, `Academic`, `Exam Hall`, `Safety`, `Finance`, `Student Affairs`)
- `priority` (`low`, `medium`, `high`, `critical`)
- `department_id` (integer)
- `sla_escalated` (`true` or `false`)
- `page` (default `1`)
- `page_size` (default `20`, max `100`)

---

## Quickstart & Setup Guide

### 1. Clone and Configure Environment

```bash
cd backend
cp .env.example .env
```

Ensure `.env` contains:
```env
PORT=8080
DB_PATH=uconnect.db
JWT_SECRET=fc493c634beced56219fc01e5a0d153336ffb24f1951eca5ab9955604f76509d
JWT_EXPIRATION_HOURS=24
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080,http://127.0.0.1:8080
GIN_MODE=release
BCRYPT_COST=14
```

### 2. Install Dependencies

```bash
go mod tidy
```

### 3. Run the Server & Seed Data

```bash
# Run server with automatic seeding of 520 complaints & 20 users
go run cmd/api/main.go --seed
```

### 4. Verify Endpoints

```bash
# 1. Health check
curl http://localhost:8080/health

# 2. Login as seeded admin
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'

# 3. Access dashboard with Bearer token
curl http://localhost:8080/api/dashboard \
  -H "Authorization: Bearer <TOKEN>"
```

---

## Running the Test Suite

Execute tests by category or run the entire suite:

```bash
# 1. Build check
go build ./...

# 2. Run unit tests
go test ./tests/unit/... -v

# 3. Run integration tests
go test ./tests/integration/... -v

# 4. Run system tests (Workflow, Security, Performance)
go test ./tests/system/... -v

# 5. Full test suite with coverage
go test ./tests/... -v -cover -timeout 120s

# 6. Concurrency race condition check
go test ./tests/... -race
```

---

## Docker Deployment

### Using Docker Compose

```bash
docker-compose up --build -d
```

Check health:
```bash
docker inspect --format='{{json .State.Health}}' uconnect-api
```
