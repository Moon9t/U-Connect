import { DatabaseSync } from 'node:sqlite';

export function runMigrations(db: DatabaseSync): void {
  /*
   * UConnect database migrations
   *
   * SDD-aligned entities:
   *   roles
   *   users
   *   departments
   *   categories
   *   complaints
   *   complaint_updates
   *   attachments
   *   feedback
   *   audit_log
   *
   * Compatibility entities/columns retained for the approved UI:
   *   users.role
   *   users.id
   *   users.updated_at
   *   departments.id
   *   departments.code
   *   departments.updated_at
   *   complaints.id
   *   complaints.category
   *   complaints.anonymous
   *   complaints.sla_escalated
   *   complaints.resolved_at
   *   complaints.updated_at
   *   comments
   *   notifications
   *   attachments.id
   *   attachments.file_size
   *   attachments.created_at
   *
   * SLA functionality is intentionally retained.
   */

  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
  `);

  /*
   * --------------------------------------------------------------------------
   * ROLES
   * --------------------------------------------------------------------------
   */
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      role_id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_name TEXT NOT NULL UNIQUE,
      description TEXT
    );
  `);

  /*
   * --------------------------------------------------------------------------
   * DEPARTMENTS
   * --------------------------------------------------------------------------
   */
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    db.exec(`
      ALTER TABLE departments
      ADD COLUMN is_active INTEGER DEFAULT 1;
    `);
  } catch {
    // Column already exists.
  }

  /*
   * --------------------------------------------------------------------------
   * USERS
   * --------------------------------------------------------------------------
   */
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      role_id INTEGER,
      department_id INTEGER,
      is_active INTEGER DEFAULT 1,
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (role_id)
        REFERENCES roles(role_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

      FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
    );
  `);

  /*
   * Upgrade existing users table.
   */
  try {
    db.exec(`
      ALTER TABLE users
      ADD COLUMN username TEXT;
    `);
  } catch {
    // Column already exists.
  }

  try {
    db.exec(`
      ALTER TABLE users
      ADD COLUMN role_id INTEGER;
    `);
  } catch {
    // Column already exists.
  }

  try {
    db.exec(`
      ALTER TABLE users
      ADD COLUMN is_active INTEGER DEFAULT 1;
    `);
  } catch {
    // Column already exists.
  }

  /*
   * NFR02:
   * Five consecutive failed login attempts lock the account.
   * The lock duration is enforced by AuthService.
   */
  try {
    db.exec(`
      ALTER TABLE users
      ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
    `);
  } catch {
    // Column already exists.
  }

  try {
    db.exec(`
      ALTER TABLE users
      ADD COLUMN locked_until DATETIME;
    `);
  } catch {
    // Column already exists.
  }

  /*
   * Normalize existing NULL values so all existing users start with
   * a clean failed-login counter.
   */
  db.exec(`
    UPDATE users
    SET failed_login_attempts = 0
    WHERE failed_login_attempts IS NULL;
  `);

  /*
   * --------------------------------------------------------------------------
   * CATEGORIES
   * --------------------------------------------------------------------------
   */
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      category_id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_name TEXT NOT NULL UNIQUE,
      description TEXT,
      is_active INTEGER DEFAULT 1
    );
  `);

  /*
   * --------------------------------------------------------------------------
   * COMPLAINTS
   * --------------------------------------------------------------------------
   */
  db.exec(`
    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_number TEXT UNIQUE,

      user_id INTEGER NOT NULL,

      category_id INTEGER,
      department_id INTEGER,

      title TEXT NOT NULL,
      description TEXT NOT NULL,
      location TEXT,

      priority TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      category TEXT,
      anonymous INTEGER DEFAULT 0,
      sla_escalated INTEGER DEFAULT 0,
      resolved_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

      FOREIGN KEY (category_id)
        REFERENCES categories(category_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

      FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
    );
  `);

  /*
   * Upgrade existing complaints table.
   */
  try {
    db.exec(`
      ALTER TABLE complaints
      ADD COLUMN reference_number TEXT;
    `);
  } catch {
    // Column already exists.
  }

  try {
    db.exec(`
      ALTER TABLE complaints
      ADD COLUMN location TEXT;
    `);
  } catch {
    // Column already exists.
  }

  try {
    db.exec(`
      ALTER TABLE complaints
      ADD COLUMN category_id INTEGER;
    `);
  } catch {
    // Column already exists.
  }

  /*
   * --------------------------------------------------------------------------
   * COMPLAINT UPDATES
   * --------------------------------------------------------------------------
   */
  db.exec(`
    CREATE TABLE IF NOT EXISTS complaint_updates (
      update_id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL,
      updated_by INTEGER NOT NULL,
      status TEXT,
      comment TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (complaint_id)
        REFERENCES complaints(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

      FOREIGN KEY (updated_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
    );
  `);

  /*
   * --------------------------------------------------------------------------
   * COMMENTS
   * --------------------------------------------------------------------------
   */
  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (complaint_id)
        REFERENCES complaints(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

      FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
    );
  `);

  /*
   * --------------------------------------------------------------------------
   * ATTACHMENTS
   * --------------------------------------------------------------------------
   */
  db.exec(`
    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (complaint_id)
        REFERENCES complaints(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
    );
  `);

  try {
    db.exec(`
      ALTER TABLE attachments
      ADD COLUMN uploaded_at DATETIME;
    `);
  } catch {
    // Column already exists.
  }

  /*
   * --------------------------------------------------------------------------
   * FEEDBACK
   * --------------------------------------------------------------------------
   */
  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback (
      feedback_id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      UNIQUE (complaint_id, user_id),

      FOREIGN KEY (complaint_id)
        REFERENCES complaints(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

      FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
    );
  `);

  /*
   * --------------------------------------------------------------------------
   * AUDIT LOG
   * --------------------------------------------------------------------------
   */
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      log_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      table_affected TEXT NOT NULL,
      record_id INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
    );
  `);

  /*
   * --------------------------------------------------------------------------
   * NOTIFICATIONS
   * --------------------------------------------------------------------------
   */
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      related_complaint_id INTEGER,
      read_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

      FOREIGN KEY (related_complaint_id)
        REFERENCES complaints(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
    );
  `);

  /*
   * --------------------------------------------------------------------------
   * SEED SDD ROLES
   * --------------------------------------------------------------------------
   */
  db.exec(`
    INSERT OR IGNORE INTO roles (
      role_name,
      description
    )
    VALUES
      ('admin', 'System administrator'),
      ('staff', 'University staff member'),
      ('student', 'University student');
  `);

  /*
   * --------------------------------------------------------------------------
   * SEED SDD CATEGORIES
   * --------------------------------------------------------------------------
   */
  db.exec(`
    INSERT OR IGNORE INTO categories (
      category_name,
      description
    )
    VALUES
      ('IT', 'Information technology complaints'),
      ('Facilities', 'Campus facilities and infrastructure'),
      ('Academic', 'Academic-related complaints'),
      ('Exam Hall', 'Examination venue complaints'),
      ('Safety', 'Safety and security complaints'),
      ('Finance', 'Finance and payment-related complaints'),
      ('Student Affairs', 'Student affairs and support complaints');
  `);

  /*
   * --------------------------------------------------------------------------
   * BACKFILL USER ROLE RELATIONSHIP
   * --------------------------------------------------------------------------
   */
  db.exec(`
    UPDATE users
    SET role_id = (
      SELECT role_id
      FROM roles
      WHERE roles.role_name = users.role
    )
    WHERE role_id IS NULL;
  `);

  db.exec(`
    UPDATE users
    SET role = 'student'
    WHERE role IS NULL
       OR role NOT IN ('admin', 'staff', 'student');
  `);

  db.exec(`
    UPDATE users
    SET role_id = (
      SELECT role_id
      FROM roles
      WHERE roles.role_name = users.role
    )
    WHERE role_id IS NULL;
  `);

  /*
   * --------------------------------------------------------------------------
   * BACKFILL USERNAMES
   * --------------------------------------------------------------------------
   */
  const usersWithoutUsername = db
    .prepare(`
      SELECT id, email
      FROM users
      WHERE username IS NULL
         OR TRIM(username) = ''
      ORDER BY id
    `)
    .all() as Array<{
      id: number;
      email: string;
    }>;

  const usernameExists = db.prepare(`
    SELECT 1
    FROM users
    WHERE username = ?
    LIMIT 1
  `);

  const updateUsername = db.prepare(`
    UPDATE users
    SET username = ?
    WHERE id = ?
  `);

  for (const user of usersWithoutUsername) {
    const emailLocalPart =
      user.email.split('@')[0]?.trim() || `user${user.id}`;

    let username = emailLocalPart;
    let suffix = 1;

    while (usernameExists.get(username)) {
      username = `${emailLocalPart}${suffix}`;
      suffix += 1;
    }

    updateUsername.run(username, user.id);
  }

  /*
   * --------------------------------------------------------------------------
   * BACKFILL COMPLAINT CATEGORY RELATIONSHIP
   * --------------------------------------------------------------------------
   */
  db.exec(`
    UPDATE complaints
    SET category_id = (
      SELECT category_id
      FROM categories
      WHERE categories.category_name = complaints.category
    )
    WHERE category_id IS NULL
      AND category IS NOT NULL;
  `);

  /*
   * --------------------------------------------------------------------------
   * BACKFILL COMPLAINT REFERENCE NUMBERS
   * --------------------------------------------------------------------------
   */
  const complaintsWithoutReference = db
    .prepare(`
      SELECT id
      FROM complaints
      WHERE reference_number IS NULL
         OR TRIM(reference_number) = ''
      ORDER BY id
    `)
    .all() as Array<{
      id: number;
    }>;

  const updateReference = db.prepare(`
    UPDATE complaints
    SET reference_number = ?
    WHERE id = ?
  `);

  for (const complaint of complaintsWithoutReference) {
    updateReference.run(
      `UC-${String(complaint.id).padStart(6, '0')}`,
      complaint.id
    );
  }

  /*
   * --------------------------------------------------------------------------
   * BACKFILL ATTACHMENT UPLOAD DATES
   * --------------------------------------------------------------------------
   */
  db.exec(`
    UPDATE attachments
    SET uploaded_at = created_at
    WHERE uploaded_at IS NULL;
  `);

  /*
   * --------------------------------------------------------------------------
   * MIGRATE EXISTING COMMENTS INTO SDD COMPLAINT UPDATES
   * --------------------------------------------------------------------------
   */
  db.exec(`
    INSERT INTO complaint_updates (
      complaint_id,
      updated_by,
      status,
      comment,
      updated_at
    )
    SELECT
      c.complaint_id,
      c.user_id,
      NULL,
      c.content,
      c.created_at
    FROM comments c
    WHERE NOT EXISTS (
      SELECT 1
      FROM complaint_updates cu
      WHERE cu.complaint_id = c.complaint_id
        AND cu.updated_by = c.user_id
        AND cu.comment = c.content
        AND cu.updated_at = c.created_at
    );
  `);

  /*
   * --------------------------------------------------------------------------
   * INDEXES
   * --------------------------------------------------------------------------
   */
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username
      ON users(username);

    CREATE INDEX IF NOT EXISTS idx_users_email
      ON users(email);

    CREATE INDEX IF NOT EXISTS idx_users_role
      ON users(role_id);

    CREATE INDEX IF NOT EXISTS idx_users_department
      ON users(department_id);

    CREATE INDEX IF NOT EXISTS idx_users_locked_until
      ON users(locked_until);

    CREATE INDEX IF NOT EXISTS idx_departments_active
      ON departments(is_active);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_complaints_reference
      ON complaints(reference_number);

    CREATE INDEX IF NOT EXISTS idx_complaints_user
      ON complaints(user_id);

    CREATE INDEX IF NOT EXISTS idx_complaints_dept
      ON complaints(department_id);

    CREATE INDEX IF NOT EXISTS idx_complaints_category
      ON complaints(category_id);

    CREATE INDEX IF NOT EXISTS idx_complaints_category_legacy
      ON complaints(category);

    CREATE INDEX IF NOT EXISTS idx_complaints_status
      ON complaints(status);

    CREATE INDEX IF NOT EXISTS idx_complaints_priority
      ON complaints(priority);

    CREATE INDEX IF NOT EXISTS idx_complaints_sla
      ON complaints(sla_escalated);

    CREATE INDEX IF NOT EXISTS idx_complaints_created
      ON complaints(created_at);

    CREATE INDEX IF NOT EXISTS idx_complaint_updates_complaint
      ON complaint_updates(complaint_id);

    CREATE INDEX IF NOT EXISTS idx_complaint_updates_user
      ON complaint_updates(updated_by);

    CREATE INDEX IF NOT EXISTS idx_comments_complaint
      ON comments(complaint_id);

    CREATE INDEX IF NOT EXISTS idx_comments_user
      ON comments(user_id);

    CREATE INDEX IF NOT EXISTS idx_notifications_user
      ON notifications(user_id);

    CREATE INDEX IF NOT EXISTS idx_attachments_complaint
      ON attachments(complaint_id);

    CREATE INDEX IF NOT EXISTS idx_feedback_complaint
      ON feedback(complaint_id);

    CREATE INDEX IF NOT EXISTS idx_feedback_user
      ON feedback(user_id);

    CREATE INDEX IF NOT EXISTS idx_audit_user
      ON audit_log(user_id);

    CREATE INDEX IF NOT EXISTS idx_audit_record
      ON audit_log(table_affected, record_id);

    CREATE INDEX IF NOT EXISTS idx_audit_timestamp
      ON audit_log(timestamp);
  `);
}