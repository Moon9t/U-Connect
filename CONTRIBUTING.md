# U-Connect Engineering Team Contribution Guidelines

Welcome to the **U-Connect** project! This repository contains both the Go Gin REST API backend and the React TypeScript frontend for the University Complaint Management System.

This document establishes development standards, branching models, code review requirements, and operational workflows for our **5-member engineering team**.

---

## 1. Team Structure & Ownership Matrix

| Role | Primary Responsibilities | Subsystem Ownership | Lead / Owner |
|---|---|---|---|
| **Backend Lead** | Architecture, Go API design, GORM schemas, SLA escalation engine, DB migrations, security | `/backend/` | **@Moon9t** |
| **Frontend Lead** | UI/UX architecture, component library, pages, routing, styling fidelity, accessibility | `/frontend/src/components/`, `/frontend/src/pages/` | Team Member 2 |
| **Integrations Engineer** | API client layer, authentication flow, error mapping, state management, end-to-end sync | `/frontend/src/services/`, `/frontend/src/types/` | Team Member 3 |
| **QA & Testing Engineer** | Unit/integration testing, API validation, regression test suites, Playwright/E2E workflows | `/backend/tests/`, `/tests/` | Team Member 4 |
| **DevOps & Infrastructure** | Docker builds, docker-compose orchestration, environment variables, CI/CD pipelines | `Dockerfile`, `docker-compose.yml`, `/.github/` | Team Member 5 |

> [!IMPORTANT]
> As defined in [`.github/CODEOWNERS`](.github/CODEOWNERS), all pull requests altering backend code (`/backend/**`) strictly require code review and approval from **@Moon9t** before merging into `master`.

---

## 2. Git Branching Strategy

We follow a structured **Feature-Branch Workflow** to ensure stability:

```
master (protected, release-ready)
  └── feature/backend-sla-monitoring
  └── feature/frontend-complaint-stepper
  └── fix/auth-token-expiration
```

### Branch Naming Conventions
- `feature/<subsystem>-<short-description>`: New features (e.g. `feature/backend-export-csv`, `feature/frontend-modal-stepper`)
- `fix/<subsystem>-<short-description>`: Bug fixes (e.g. `fix/backend-cors-origin`, `fix/frontend-toast-portal`)
- `refactor/<subsystem>-<short-description>`: Code improvements without functional change
- `docs/<short-description>`: Documentation or schema updates
- `test/<subsystem>-<short-description>`: Test suite additions or benchmarking

---

## 3. Commit Message Standards

We enforce the **Conventional Commits** specification:

```
<type>(<scope>): <short summary in imperative mood>

[optional body explaining context or breaking changes]

[optional issue or PR reference, e.g. Closes #12]
```

### Allowed Types:
- `feat`: A new user-facing feature or API endpoint
- `fix`: A bug fix
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance optimization
- `test`: Adding or correcting tests
- `docs`: Documentation updates
- `chore`: Tooling, configuration, or dependency updates

### Examples:
- `feat(backend): implement auto-escalation rule 1 for safety category`
- `feat(frontend): add human-centric resolution stepper in modal`
- `fix(auth): correct jwt token expiration calculation`
- `test(complaints): add unit test for strict transition state machine`

---

## 4. Pull Request & Code Review Process

1. **Self-Check Before Submitting PR**:
   - Backend: Ensure `go test ./...` passes without errors.
   - Frontend: Ensure `npm run build` (`tsc -b && vite build`) completes with **0 errors**.
   - Ensure zero emojis are introduced into the frontend (use `lucide-react` SVG icons only).
2. **Open Pull Request**:
   - Provide a concise description of the changes made and link any related issues.
   - Include test verification steps or screenshots for UI modifications.
3. **Review & Approvals**:
   - At least **1 peer review** is required for all PRs.
   - Any modifications touching `/backend/` **must be approved by @Moon9t**.
4. **Merge**:
   - Use **Squash and Merge** or **Rebase and Merge** to maintain a clean linear commit history.

---

## 5. Local Development Setup

### Prerequisites
- **Go**: `1.21+` (tested on Go 1.25)
- **Node.js**: `v20+` or `v24+` with `npm 10+`
- **Git**: `2.30+`

### Initial Clone
```bash
git clone https://github.com/Moon9t/U-Connect.git
cd U-Connect
```

### Backend Setup
```bash
cd backend
# 1. Copy environment template
cp .env.example .env

# 2. Download and verify Go dependencies
go mod tidy

# 3. Run backend with automatic seeding (520 complaints, 20 users)
go run cmd/api/main.go --seed
```
*Backend runs on `http://localhost:8080`.*
*Health check available at `http://localhost:8080/health`.*

### Frontend Setup
```bash
cd ../frontend
# 1. Install dependencies
npm install

# 2. Start Vite dev server with API proxy
npm run dev
```
*Frontend runs on `http://localhost:3000` and proxies `/api` calls to `http://localhost:8080`.*

---

## 6. Code Style & Architecture Rules

### Backend Architecture (Go)
1. **Layer Separation**:
   - Handlers (`internal/handlers/`): Parse requests, validate input, write JSON response using `pkg/utils/response.go`.
   - Services (`internal/services/`): Business logic, auto-escalation, status state machines, SLA breach calculation.
   - Repositories (`internal/repositories/`): Direct GORM database queries.
   - Models (`internal/models/`): Entity structs and domain invariants.
2. **Concurrency**: SQLite runs with `SetMaxOpenConns(1)` to prevent database locks.
3. **Security**: Passwords hashed with bcrypt (cost 14). All protected routes validated with JWT middleware.

### Frontend Architecture (TypeScript & React)
1. **Strict Types**: Always import or declare types in `src/types/api.ts`. Never use `any` unless explicitly wrapping unknown third-party library returns.
2. **Design Standards**:
   - **No Emojis**: Strictly forbidden. Use `lucide-react` modern geometric SVG icons.
   - **OpenAI Aesthetic**: Calm, organic neutrals (`#fbfbfb`, `#18181b`, `#f4f4f5`), soft borders, tranquil spacing, and empathetic human microcopy.
   - **Modals & Overlays**: Always use React's `createPortal(..., document.body)` to avoid stacking context and scrolling issues.

---

## 7. Testing & Verification

Run these verification commands before pushing:

```bash
# Backend Test Suite
cd backend
go test ./... -v

# Frontend TypeScript & Bundle Build
cd ../frontend
npm run build
```
