# U-Connect Engineering Team Contribution Guidelines

Welcome to the **U-Connect** project. This repository contains the TypeScript/Express backend, the React + Vite frontend, and the shared project documentation for the university complaint management workflow.

This guide captures the standards, branch workflow, code review expectations, and local validation steps that match the current implementation in the repo.

---

## 1. Team Structure & Ownership Matrix

| Role | Primary Responsibilities | Subsystem Ownership | Lead / Owner |
|---|---|---|---|
| **Backend Lead** | API design, SQLite schema evolution, auth, complaint rules, reports, admin workflows | `/backend/src/` | **@Moon9t** |
| **Frontend Lead** | UI/UX, dashboard flows, page composition, route consistency, accessibility | `/frontend/src/components/`, `/frontend/src/pages/` | Team Member 2 |
| **Integrations Engineer** | API-client wiring, auth/session flow, service contracts, frontend state handling | `/frontend/src/services/`, `/frontend/src/types/` | Team Member 3 |
| **QA / Release Engineer** | Regression checks, API validation, smoke testing, verification before merge | `/backend/src/`, `/frontend/src/` | Team Member 4 |
| **DevOps / Platform** | Local orchestration, environment variables, Docker usage, deployment readiness | `backend/Dockerfile`, `backend/docker-compose.yml`, `/.github/` | Team Member 5 |

> [!IMPORTANT]
> Backend changes within `/backend/` are treated as high-impact work and should be reviewed by the designated backend owner before merge.

---

## 2. Git Branching Strategy

We follow a structured **feature-branch workflow** to keep mainline changes stable:

```text
main (protected)
  ├── feature/backend-reporting
  ├── feature/frontend-dashboard-polish
  ├── fix/auth-session-refresh
  ├── refactor/complaint-validation
  └── docs/contribution-updates
```

### Branch Naming Conventions
- `feature/<subsystem>-<short-description>`: New functionality or larger workflow additions
- `fix/<subsystem>-<short-description>`: Bug fixes and correctness changes
- `refactor/<subsystem>-<short-description>`: Internal cleanup without user-visible behavior change
- `docs/<short-description>`: Documentation updates and engineering notes
- `test/<subsystem>-<short-description>`: Adds or fixes validation coverage

Examples:
- `feature/backend-reports-export`
- `fix/frontend-login-validation`
- `refactor/complaint-status-guards`

---

## 3. Commit Message Standards

Use the **Conventional Commits** format:

```text
<type>(<scope>): <short summary in imperative mood>

[optional body explaining the context or any breaking change]

[optional issue or PR reference, e.g. Closes #23]
```

### Allowed Types
- `feat`: New feature or endpoint
- `fix`: Bug fix or defect correction
- `refactor`: Non-functional restructuring or cleanup
- `perf`: Performance improvement
- `test`: Test coverage updates or regression checks
- `docs`: Documentation changes
- `chore`: Tooling, config, or dependency maintenance

### Examples
- `feat(backend): add complaint export PDF route`
- `fix(auth): handle invalid JWT refresh flow`
- `refactor(validation): centralize complaint request schema`
- `test(frontend): add dashboard filter regression checks`

---

## 4. Pull Request & Code Review Process

1. **Self-check before submitting**:
   - Backend: run `npm run build` in `/backend` and confirm the service starts without TypeScript errors.
   - Frontend: run `npm run build` in `/frontend` and confirm the app bundles successfully.
   - Confirm no emoji-only UI patterns or unsafe assumptions are introduced.
2. **PR content**:
   - Summarize what changed and why.
   - Include screenshots for UI-heavy changes when helpful.
   - Link the related issue or work item when applicable.
3. **Review & approvals**:
   - At least **1 peer review** is required for most changes.
   - Any substantial change in `/backend/src/` should be reviewed by the designated backend owner before merge.
4. **Merge policy**:
   - Prefer **Squash and Merge** for a clean history.
   - Do not merge changes with unresolved validation failures.

---

## 5. Local Development Setup

### Prerequisites
- **Node.js**: `v22+` recommended
- **npm**: `10+`
- **Git**: `2.30+`

### Initial Clone
```bash
git clone https://github.com/Moon9t/U-Connect.git
cd U-Connect
```

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

The backend runs on `http://localhost:8080` by default and exposes health checks at `/health`.

### Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```

The frontend runs on the Vite default local port (typically `http://localhost:3000`) and is expected to connect to the backend API running on `http://localhost:8080`.

---

## 6. Code Style & Architecture Rules

### Backend Architecture (Node.js + Express + TypeScript)
1. **Service layout**:
   - `backend/src/routes/`: HTTP routing and endpoint registration
   - `backend/src/services/`: business logic and domain workflows
   - `backend/src/validators/`: request validation and schema checks
   - `backend/src/middleware/`: auth, request handling, and shared guards
   - `backend/src/config/`: SQLite setup and application bootstrap config
   - `backend/src/utils/`: helper utilities and shared output logic
2. **Database**:
   - The application uses SQLite with `node:sqlite` in `backend/src/config/database.ts`.
   - Database initialization is done on startup with schema bootstrapping and migration-safe backfills.
3. **Security**:
   - Passwords are hashed with `bcryptjs`.
   - JWT-based authentication is enforced for protected routes.
   - Request validation should happen in the validation layer before service logic.

### Frontend Architecture (React + TypeScript + Vite)
1. **Strict typing**:
   - Prefer explicit interfaces in `frontend/src/types/`.
   - Avoid `any` unless it is required for a third-party or uncertain runtime contract.
2. **Design standards**:
   - Keep the OpenAI-inspired neutral palette and emotional, human-first copy.
   - Use `lucide-react` icons rather than emoji.
   - Preserve accessible interactions and consistent layout patterns across components.
3. **Service usage**:
   - Route API calls through the service modules in `frontend/src/services/` instead of in page components.

---

## 7. Testing & Verification

Run these checks before pushing a branch:

```bash
# Backend validation
cd backend
npm run build

# Frontend validation
cd ../frontend
npm run build
```

If a change affects authentication, complaint lifecycle rules, reports, or admin flows, perform a targeted manual smoke test against the relevant endpoints and UI screens before merge.

---

## 8. Repository Expectations

- Keep code and docs aligned with the current architecture.
- Update the relevant validation and integration paths when changing routes, database fields, or service contracts.
- Prefer small, reviewable pull requests over broad rewrites.
- Maintain consistency with existing naming, validation patterns, and folder structure.

This document is intentionally aligned with the current codebase configuration and should be updated whenever the backend stack, folder structure, or engineering workflow changes materially.
