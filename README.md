# U-Connect | University Grievance Management System

[![Go](https://img.shields.io/badge/Go-1.21+-00ADD8?style=flat&logo=go)](https://golang.org)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8.0+-646CFF?style=flat&logo=vite)](https://vitejs.dev)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**U-Connect** is an institutional complaint and grievance management platform built for modern universities. It provides students with a human-centered, responsive channel to submit grievances, staff with tools to triage and resolve issues, and university leadership with oversight through automated SLA monitoring, escalation triggers, and institutional analytics.

---

## 🏛 System Architecture

```
                                 [ Browser Client ]
                                          │
                        Vite Proxy (:3000) / Direct HTTP
                                          │
                                          ▼
                         ┌─────────────────────────────────┐
                         │      U-Connect Go REST API      │
                         │          (Port :8080)           │
                         └────────────────┬────────────────┘
                                          │
               ┌──────────────────────────┼──────────────────────────┐
               ▼                          ▼                          ▼
      [ JWT Middleware ]         [ SLA Engine ]            [ Business Rules ]
       - RBAC Scoping             - 72h Breaches            - Rule 1: Auto-Escalation
       - Identity Masking         - Auto Priority           - Rule 2: State Transitions
               │                          │                          │
               └──────────────────────────┼──────────────────────────┘
                                          │
                                          ▼
                                ┌───────────────────┐
                                │   SQLite + GORM   │
                                │   (uconnect.db)   │
                                └───────────────────┘
```

---

## ✨ Key Features & Business Rules

1. **Automated Escalation (Rule 1)**: Automatically escalates Exam Hall and Safety grievances to `high` priority; overrides with `critical` when urgent emergency keywords (*emergency*, *urgent*, *critical*, *immediate*, *danger*) are detected.
2. **Strict Transition State Machine (Rule 2)**: Enforces complaint workflow progression:
   - `pending` &rarr; `in-progress`, `resolved`, `closed`
   - `in-progress` &rarr; `resolved`, `closed`, `pending`
   - `resolved` &rarr; `closed`
   - `closed` &rarr; terminal (no further transitions permitted)
3. **SLA Breach Monitoring (Rule 3)**: Automatic tracking of complaints open beyond 72 hours with batch escalation and visual warning indicators.
4. **Anonymous Student Masking (Rule 4)**: Masks student identity from departmental staff responses while maintaining administrative oversight.
5. **Threaded Discussion Activity (Rule 5)**: Real-time discussion logs on complaints with verified role badges (`Student`, `Staff`, `Admin`).
6. **OpenAI-Inspired Design Language**: Quiet, authentic, human-centric aesthetic with warm neutrals (`#fbfbfb`, `#18181b`), zero emojis, and clean vector geometry via `lucide-react`.

---

## 📦 Tech Stack

| Layer | Technologies | Purpose |
|---|---|---|
| **Frontend** | React 19, TypeScript, Vite, Lucide Icons | Responsive SPA, lifecycle stepper, dashboard |
| **Backend** | Go 1.21+, Gin, GORM | High-throughput RESTful API (<2s query latency) |
| **Database** | SQLite3 (`SetMaxOpenConns(1)`) | Relational persistence with foreign keys |
| **Security** | JWT (`golang-jwt/jwt/v5`), Bcrypt (cost 14) | Stateless authentication & password hashing |
| **Orchestration** | Docker, Docker Compose | Containerized local and staging deployment |

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Go 1.21+**
- **Node.js v20+** and **npm**
- **Git**

### 2. Clone Repository
```bash
git clone https://github.com/Moon9t/U-Connect.git
cd U-Connect
```

### 3. Start the Go Backend
```bash
cd backend
cp .env.example .env
go mod tidy

# Run server with 520 complaints & 20 users pre-seeded
go run cmd/api/main.go --seed
```
*Backend runs on `http://localhost:8080`. Health check: `http://localhost:8080/health`*

### 4. Start the Frontend
```bash
cd ../frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:3000` with automated proxy to the backend API.*

---

## 🔑 Demo Accounts & Seeded Credentials

All accounts share the default password: **`password123`**

| Role | Email | Access Scope |
|---|---|---|
| **Admin** | `admin@test.com` | Full institutional oversight, user roles, departments, CSV export |
| **Staff** | `staff1@uconnect.edu` | Departmental ticket assignment, status progression, responses |
| **Student** | `student1@uconnect.edu` | Personal dashboard, grievance submission, anonymous toggle |

> [!TIP]
> The login screen includes **Instant Demo Sign-In** pills to switch roles in 1 click without retyping credentials.

---

## 📂 Repository Structure

```
U-Connect/
├── .github/
│   └── CODEOWNERS                  # Subsystem code ownership rules
├── backend/
│   ├── cmd/api/main.go             # Backend entrypoint
│   ├── internal/
│   │   ├── config/                 # DB connection & SQLite concurrency setup
│   │   ├── handlers/               # Gin route controllers
│   │   ├── middleware/             # JWT verification & RBAC authorization
│   │   ├── models/                 # Domain entities (User, Complaint, Department, Comment)
│   │   ├── repositories/           # GORM data access layer
│   │   ├── routes/                 # Endpoint routing & CORS setup
│   │   └── services/               # Business logic & SLA state machines
│   ├── migrations/                 # Schema auto-migration & seeder
│   ├── pkg/utils/                  # JWT, bcrypt, and standard response helpers
│   └── tests/                      # Unit, integration, and system tests
├── frontend/
│   ├── src/
│   │   ├── components/             # Layout (Navbar, Sidebar), Common (Badge, Modal, Toast)
│   │   ├── context/                # AuthContext & Session management
│   │   ├── pages/                  # Login, StudentDashboard, SubmitComplaint, AdminManagement
│   │   ├── services/               # API clients for complaints, auth, departments, metrics
│   │   ├── types/                  # Strict TypeScript API models
│   │   ├── App.tsx                 # Root layout & route coordinator
│   │   └── index.css               # OpenAI-inspired design tokens
│   ├── package.json
│   └── vite.config.ts              # Port 3000 & API proxy configuration
├── docs/
│   └── ARCHITECTURE.md             # System design & SLA state machine specifications
├── CONTRIBUTING.md                  # 5-person team workflow & PR guidelines
└── README.md                       # Project documentation
```

---

## 👥 Engineering Team & Governance

- **Backend Lead & Core Architect**: **@Moon9t** (Code owner for `/backend/`)
- For contribution workflows, PR guidelines, and branch strategies, refer to [**`CONTRIBUTING.md`**](CONTRIBUTING.md).
- For subsystem ownership rules, refer to [**`.github/CODEOWNERS`**](.github/CODEOWNERS).
