# UConnect Backend

Node.js + Express + TypeScript backend for the UConnect University Complaint Management System. SQLite is retained as the database, in accordance with the SDD.

## Stack
- Node.js 22
- Express
- TypeScript
- SQLite (`node:sqlite`)
- JWT authentication
- bcrypt password hashing
- Zod request validation
- Multer file uploads
- PDFKit PDF reports

## Run

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm start
```

The API listens on port `8080` by default.

## API

### Authentication
- `POST /api/auth/login` — username + password
- `POST /api/auth/register`
- `POST /api/auth/logout`

### Complaints
- `POST /api/complaints`
- `GET /api/complaints`
- `GET /api/complaints/:id`
- `PUT /api/complaints/:id`
- `DELETE /api/complaints/:id` — admin
- `PUT /api/complaints/:id/assign` — staff/admin
- `PUT /api/complaints/:id/status` — staff/admin
- `POST /api/complaints/:id/comments`
- `GET /api/complaints/:id/comments`
- `POST /api/complaints/:id/attachments`
- `GET /api/complaints/:id/attachments`
- `POST /api/complaints/:id/feedback`
- `GET /api/complaints/:id/feedback`

`GET /api/complaints` supports `reference_number`, `status`, `category`, `priority`, `department_id`, `sla_escalated`, `page`, and `page_size`.

### Reports
- `GET /api/reports/complaints?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/reports/complaints/by-category`
- `GET /api/reports/complaints/by-status`
- `GET /api/reports/complaints/export/pdf`

### Administration
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PUT /api/admin/users/:id`
- `PUT /api/admin/users/:id/role`
- `PUT /api/admin/users/:id/deactivate`
- `GET /api/departments`
- `POST /api/admin/departments`
- `PUT /api/admin/departments/:id`
- `DELETE /api/admin/departments/:id`

### Other
- `GET /api/dashboard`
- `GET /api/notifications`
- `PUT /api/notifications/read-all`
- `PUT /api/notifications/:id/read`
- `GET /health`

## Database migration

The application startup migration preserves the existing SQLite database and backfills the SDD fields `username`, `is_active`, `reference_number`, and `location`, while creating `roles`, `categories`, `complaint_updates`, `attachments`, `feedback`, and `audit_log`.
