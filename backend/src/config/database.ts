import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const dbPath =
  process.env.DB_PATH ||
  path.resolve(process.cwd(), 'uconnect.db');

const absolutePath = path.isAbsolute(dbPath)
  ? dbPath
  : path.resolve(process.cwd(), dbPath);

fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

export const db = new DatabaseSync(absolutePath);

db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA journal_mode = WAL');

export function nowIso() {
  return new Date().toISOString();
}

export function initializeDatabase() {
  /*
   * The database schema follows the UConnect SDD.
   *
   * The production database is migrated separately by
   * migrate-to-sdd.mjs. This function only ensures that
   * the required SDD tables exist for a fresh database.
   */

  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      role_id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_name TEXT NOT NULL UNIQUE,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS departments (
      department_id INTEGER PRIMARY KEY AUTOINCREMENT,
      department_name TEXT NOT NULL UNIQUE,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS categories (
      category_id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_name TEXT NOT NULL UNIQUE,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      email TEXT UNIQUE,
      role_id INTEGER,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME,
      FOREIGN KEY (role_id)
        REFERENCES roles(role_id)
    );

    CREATE TABLE IF NOT EXISTS complaints (
      complaint_id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_number TEXT UNIQUE,
      user_id INTEGER NOT NULL,
      category_id INTEGER,
      department_id INTEGER,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      location TEXT,
      priority TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      submitted_at DATETIME,
      FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
      FOREIGN KEY (category_id)
        REFERENCES categories(category_id),
      FOREIGN KEY (department_id)
        REFERENCES departments(department_id)
        ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS complaint_updates (
      update_id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL,
      updated_by INTEGER NOT NULL,
      status TEXT NOT NULL,
      comment TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (complaint_id)
        REFERENCES complaints(complaint_id)
        ON DELETE CASCADE,
      FOREIGN KEY (updated_by)
        REFERENCES users(user_id)
        ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attachments (
      attachment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT,
      uploaded_at TEXT NOT NULL,
      FOREIGN KEY (complaint_id)
        REFERENCES complaints(complaint_id)
        ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS feedback (
      feedback_id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      rating INTEGER NOT NULL
        CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,
      submitted_at TEXT NOT NULL,
      UNIQUE (complaint_id, user_id),
      FOREIGN KEY (complaint_id)
        REFERENCES complaints(complaint_id)
        ON DELETE CASCADE,
      FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      log_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      table_affected TEXT NOT NULL,
      record_id INTEGER,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL
    );
  `);

  /*
   * Seed the SDD-defined roles.
   */
  const roleSeed = db.prepare(
    `INSERT OR IGNORE INTO roles (
       role_name,
       description
     )
     VALUES (?, ?)`
  );

  roleSeed.run(
    'admin',
    'System administrator'
  );

  roleSeed.run(
    'staff',
    'University staff member'
  );

  roleSeed.run(
    'student',
    'University student'
  );

  /*
   * Seed the SDD-defined complaint categories.
   */
  const categorySeed = db.prepare(
    `INSERT OR IGNORE INTO categories (
       category_name,
       description
     )
     VALUES (?, ?)`
  );

  const categories = [
    'IT',
    'Facilities',
    'Academic',
    'Exam Hall',
    'Safety',
    'Finance',
    'Student Affairs',
  ];

  for (const category of categories) {
    categorySeed.run(
      category,
      `${category} complaints`
    );
  }

  /*
   * Indexes required by the SDD/API workload.
   */
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sdd_complaints_reference_number
      ON complaints(reference_number);

    CREATE INDEX IF NOT EXISTS idx_sdd_complaints_user_id
      ON complaints(user_id);

    CREATE INDEX IF NOT EXISTS idx_sdd_complaints_department_id
      ON complaints(department_id);

    CREATE INDEX IF NOT EXISTS idx_sdd_complaints_submitted_at
      ON complaints(submitted_at);
  `);
}