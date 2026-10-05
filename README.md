# UConnect | University Complaint Management System

**UConnect** is a university complaint and grievance management platform. It provides students with a structured channel to submit and track complaints, staff with tools to manage and resolve complaints, and administrators with institutional oversight, reporting, and user-management capabilities.

---

## System Architecture

```text
                         [ Browser Client ]
                                |
                         Vite (:3000)
                                |
                                v
                  +---------------------------+
                  |   Node.js + Express API   |
                  |        (:8080)             |
                  +-------------+-------------+
                                |
              +-----------------+-----------------+
              |                 |                 |
              v                 v                 v
       [ JWT + RBAC ]    [ Business Rules ]  [ Reports ]
       Authentication    Complaint workflow   PDF export
       Access control    Status management
       Ownership scope   Validation
              |                 |                 |
              +-----------------+-----------------+
                                |
                                v
                     +-------------------+
                     |      SQLite       |
                     |   node:sqlite     |
                     |  uconnect.db      |
                     +-------------------+
```

The current implementation uses:

* **Frontend:** React + TypeScript + Vite
* **Backend:** Node.js + Express + TypeScript
* **Database:** SQLite using Node.js `node:sqlite`
* **Authentication:** JWT
* **Password hashing:** bcryptjs
* **Validation:** Zod
* **File uploads:** Multer
* **PDF reports:** PDFKit

---

## Key Features

### Authentication and Access Control

* Username/password authentication
* JWT-based authentication
* Role-based access control
* Student ownership restrictions
* Active/inactive user accounts
* 30-minute inactivity logout
* Temporary account lockout after repeated failed login attempts

### Complaint Management

* Submit complaints with title, description, category, and location
* Unique complaint reference numbers
* Complaint status tracking
* Department assignment
* Complaint editing
* Administrative complaint deletion
* Complaint progress comments
* Complaint history
* Complaint priority handling
* Anonymous complaint identity masking
* Complaint filtering and pagination

### Attachments

* Upload supporting files to complaints
* View complaint attachments
* File-size validation
* Uploaded files stored outside the Git repository

### Feedback

* Students can provide feedback after resolution
* 1–5 complaint rating
* Feedback comments

### Administration

* Create user accounts
* Update users
* Change user roles
* Deactivate users
* Create, update, and delete departments
* Institutional complaint oversight

### Reporting

* Complaint summaries by date range
* Complaints grouped by category
* Complaints grouped by status
* PDF complaint report export
* Dashboard statistics

### Notifications

* Complaint-related notifications
* Mark individual notifications as read
* Mark all notifications as read

---

## Tech Stack

| Layer                | Technologies                             | Purpose                                      |
| -------------------- | ---------------------------------------- | -------------------------------------------- |
| **Frontend**         | React 19, TypeScript, Vite, Lucide React | Responsive web application                   |
| **Backend**          | Node.js, Express 5, TypeScript           | REST API and business logic                  |
| **Database**         | SQLite, `node:sqlite`                    | Relational data persistence                  |
| **Authentication**   | JWT, bcryptjs                            | Authentication and password security         |
| **Validation**       | Zod                                      | Request validation                           |
| **File Uploads**     | Multer                                   | Complaint attachments                        |
| **Reports**          | PDFKit                                   | PDF report generation                        |
| **Development**      | npm, tsx                                 | Dependency management and development server |
| **Containerisation** | Docker, Docker Compose                   | Local/deployment support                     |

---

## Quickstart Guide

### 1. Prerequisites

Install:

* **Node.js 22 or later**
* **npm 10 or later**
* **Git**

Check your versions:

```bash
node --version
npm --version
git --version
```

---

### 2. Clone the Repository

```bash
git clone <repository-url>
cd U-Connect
```

Replace `<repository-url>` with the repository URL used by the team.

---

### 3. Start the Backend

```bash
cd backend-node
npm install
npm run dev
```

The backend runs on:

```text
http://localhost:8080
```

Health check:

```text
http://localhost:8080/health
```

The backend uses the SQLite database located at:

```text
backend/uconnect.db
```

The database file is intentionally ignored by Git.

---

### 4. Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on:

```text
http://localhost:3000
```

The Vite development server proxies API requests to the backend on port `8080`.

---

## Production Build

### Backend

```bash
cd backend-node
npm run build
npm start
```

### Frontend

```bash
cd frontend
npm run build
```

---

## API Overview

### Authentication

```text
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
```

### Complaints

```text
POST   /api/complaints
GET    /api/complaints
GET    /api/complaints/:id
PUT    /api/complaints/:id
DELETE /api/complaints/:id
PUT    /api/complaints/:id/assign
PUT    /api/complaints/:id/status
POST   /api/complaints/:id/comments
GET    /api/complaints/:id/comments
POST   /api/complaints/:id/attachments
GET    /api/complaints/:id/attachments
POST   /api/complaints/:id/feedback
GET    /api/complaints/:id/feedback
```

### Reports

```text
GET /api/reports/complaints
GET /api/reports/complaints/by-category
GET /api/reports/complaints/by-status
GET /api/reports/complaints/export/pdf
```

### Administration

```text
GET  /api/admin/users
POST /api/admin/users
PUT  /api/admin/users/:id
PUT  /api/admin/users/:id/role
PUT  /api/admin/users/:id/deactivate

GET    /api/departments
POST   /api/admin/departments
PUT    /api/admin/departments/:id
DELETE /api/admin/departments/:id
```

### Dashboard and Notifications

```text
GET /api/dashboard

GET /api/notifications
PUT /api/notifications/read-all
PUT /api/notifications/:id/read
```

### Health

```text
GET /health
```

---

## Database

UConnect uses SQLite through Node.js's built-in `node:sqlite` module.

The database schema contains the following primary entities:

```text
users
roles
departments
categories
complaints
complaint_updates
attachments
feedback
audit_log
```

The application performs schema initialization and migration-safe backfills when the backend starts.

The migration preserves existing complaint and user data while adding fields required by the current SDD, including:

* `username`
* `is_active`
* `reference_number`
* `location`

It also creates the supporting SDD entities for:

* roles
* categories
* complaint updates
* attachments
* feedback
* audit logging

The local SQLite database and SQLite WAL runtime files are excluded from Git.

---

## Repository Structure

```text
U-Connect/
├── .github/
│   └── CODEOWNERS
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── validators/
│   │   ├── app.ts
│   │   └── server.ts
│   │
│   ├── uploads/
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── .env.example
│   ├── .gitignore
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.ts
│
├── docs/
├── CONTRIBUTING.md
└── README.md
```

---

## Development Workflow

UConnect uses a feature-branch workflow.

Example:

```bash
git checkout -b feature/complaint-feedback
```

Before pushing changes:

```bash
cd backend-node
npm run build

cd ../frontend
npm run build
```

Changes should be tested against the relevant functionality before opening a pull request.

For contribution rules, branch naming, commit conventions, and review requirements, see:

```text
CONTRIBUTING.md
```

---

## Architecture Consistency

The current implementation is intentionally aligned with the project's SRS and SDD.

The approved technology architecture is:

```text
React + TypeScript + Vite
            |
            v
Node.js + Express + TypeScript
            |
            v
SQLite
```


---

## Project Scope

UConnect focuses on university complaint and grievance management, including:

* complaint submission
* complaint tracking
* complaint assignment
* status management
* progress updates
* supporting attachments
* feedback
* user administration
* reporting
* notifications

The system does not provide:

* a dedicated mobile application
* emergency services
* online payments
* AI-based automatic complaint resolution
* external organization complaint management
* government-system integration
* academic results management
* admissions or registration management
* GPS-based emergency tracking
* social-media integration

---

## Engineering Team

The project follows the team's contribution and review workflow documented in:

```text
CONTRIBUTING.md
```

Backend and frontend changes should be reviewed and tested before being merged into the protected main branch.
