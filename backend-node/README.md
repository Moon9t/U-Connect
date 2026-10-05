# U-Connect Node.js Backend

A modern, high-performance Node.js & TypeScript backend for the **U-Connect Grievance Management System**, providing full feature and schema parity with the Go backend, complete with strict business rules, 520+ seeded records, SLA monitoring, and automated test coverage.

---

## 🌟 Key Architecture & Capabilities

1. **Enterprise TypeScript & Express**:
   - Clean layered architecture: Controllers &rarr; Services &rarr; Data Access &rarr; Database.
   - Built-in SQLite database engine (`node:sqlite`) with WAL mode and foreign key enforcement.
2. **5 Core Business Rules**:
   - **Rule 1 (Auto-Escalation)**: Immediate keyword detection (`emergency`, `urgent`, `critical`, `immediate`, `danger`) auto-escalates complaints to `critical`. Exam Hall & Safety categories auto-escalate to `high`.
   - **Rule 2 (Strict State Machine)**: Enforced transitions (`pending` &rarr; `in-progress` &rarr; `resolved` &rarr; `closed`). `closed` is guaranteed terminal.
   - **Rule 3 (SLA Breach Engine)**: Automated 72-hour threshold evaluation with background task escalation.
   - **Rule 4 (Anonymous Masking)**: Student identities in anonymous submissions are strictly hidden (`user_id = 0`, `user = null`) from student and staff views, and visible only to system administrators.
   - **Rule 5 (Role-Based Access Control)**: Middleware-guarded roles (`student`, `staff`, `admin`).
3. **Database Seeding (520+ Records)**:
   - 5 Departments (IT, Facilities, Academic, Exam Hall, Safety)
   - 20 Preconfigured Accounts (4 Admins, 6 Staff, 10 Students with default password `password123`)
   - 520+ Grievance records spanning 120 days with SLA breaches, resolution durations, and realistic distributions.
4. **Comprehensive 3-Tier Test Suite**:
   - Unit tests (JWT, password hashing, state machine, auto-escalation)
   - Integration tests (Auth, complaint CRUD, role guards, filtering)
   - System tests (Full end-to-end grievance lifecycle, CSV export, dashboard KPI metrics)

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Seed Database
```bash
npm run seed
```
*(Populates `uconnect.db` with 5 departments, 20 users, and 520+ grievances).*

### 3. Start Development Server
```bash
npm run dev
```
The server will start on `http://127.0.0.1:8080`.

### 4. Connect Frontend
Start the React frontend from the `frontend/` directory:
```bash
npm run dev
```
The frontend automatically proxies `/api` and `/health` requests to `http://127.0.0.1:8080`.

---

## 🧪 Running Automated Tests

Run all unit, integration, and system tests:
```bash
npm test
```

---

## 🔑 Demo Credentials

All accounts use password: `password123`

| Role | Email | Name |
|---|---|---|
| **Admin** | `admin@test.com` | Admin |
| **Admin** | `admin2@uconnect.edu` | Sarah Jenkins |
| **Staff** | `staff1@uconnect.edu` | David Miller (IT) |
| **Staff** | `staff2@uconnect.edu` | Emma Watson (Facilities) |
| **Student** | `student1@uconnect.edu` | Alex Turner |
| **Student** | `student2@uconnect.edu` | Bethany Clark |

---

## 📡 API Overview

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/health` | Public | System health check |
| `POST` | `/api/auth/register` | Public | User registration |
| `POST` | `/api/auth/login` | Public | JWT Authentication |
| `GET` | `/api/complaints` | Authenticated | List complaints (filtered, paginated, RBAC-scoped) |
| `POST` | `/api/complaints` | Authenticated | Submit grievance (triggers Auto-escalation) |
| `GET` | `/api/complaints/:id` | Authenticated | View single grievance with comments |
| `PUT` | `/api/complaints/:id/status` | Staff, Admin | Update status (enforces state machine) |
| `POST` | `/api/complaints/:id/comments` | Authenticated | Add discussion comment |
| `GET` | `/api/complaints/export/csv` | Staff, Admin | Export grievances to CSV |
| `GET` | `/api/dashboard` | Authenticated | Aggregated metrics, resolution hours & SLA counts |
| `GET` | `/api/notifications` | Authenticated | User in-app notifications |
| `PUT` | `/api/notifications/read-all` | Authenticated | Mark all notifications read |
| `GET` | `/api/departments` | Authenticated | List campus departments |
| `GET` | `/api/admin/users` | Admin | Manage users |
| `PUT` | `/api/admin/users/:id/role` | Admin | Update user role |
| `POST` | `/api/admin/departments` | Admin | Create department |
| `DELETE` | `/api/admin/departments/:id` | Admin | Delete department |
