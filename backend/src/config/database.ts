import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const dbPath = process.env.DB_PATH || path.resolve(process.cwd(), 'uconnect.db');
const absolutePath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);
fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

export const db = new DatabaseSync(absolutePath);
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA journal_mode = WAL');

export function nowIso() { return new Date().toISOString(); }

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, code TEXT NOT NULL UNIQUE, description TEXT, created_at TEXT, updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS roles (
      role_id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_name TEXT NOT NULL UNIQUE,
      description TEXT
    );
    CREATE TABLE IF NOT EXISTS categories (
      category_id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_name TEXT NOT NULL UNIQUE,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1
    );
  `);

  const userCols = db.prepare('PRAGMA table_info(users)').all() as Array<{name:string}>;
  if (userCols.length) {
    if (!userCols.some(c => c.name === 'username')) db.exec('ALTER TABLE users ADD COLUMN username TEXT');
    if (!userCols.some(c => c.name === 'is_active')) db.exec('ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
  } else {
    db.exec(`CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'student',
      department_id INTEGER, is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT, updated_at TEXT,
      FOREIGN KEY(department_id) REFERENCES departments(id) ON DELETE SET NULL ON UPDATE CASCADE
    )`);
  }

  const complaintCols = db.prepare('PRAGMA table_info(complaints)').all() as Array<{name:string}>;
  if (complaintCols.length) {
    if (!complaintCols.some(c => c.name === 'reference_number')) db.exec('ALTER TABLE complaints ADD COLUMN reference_number TEXT');
    if (!complaintCols.some(c => c.name === 'location')) db.exec('ALTER TABLE complaints ADD COLUMN location TEXT');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS complaint_updates (
      update_id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      comment TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS attachments (
      attachment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT,
      uploaded_at TEXT NOT NULL,
      FOREIGN KEY(complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS feedback (
      feedback_id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT,
      submitted_at TEXT NOT NULL,
      UNIQUE(complaint_id, user_id),
      FOREIGN KEY(complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      log_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      table_affected TEXT NOT NULL,
      record_id INTEGER,
      timestamp TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Backfill fields introduced by the SDD without discarding existing SQLite data.
  const users = db.prepare('SELECT id,email,username,is_active FROM users').all() as Array<{id:number,email:string,username:string|null,is_active:number|null}>;
  const updateUser = db.prepare('UPDATE users SET username=?, is_active=COALESCE(is_active,1), updated_at=COALESCE(updated_at,?) WHERE id=?');
  for (const u of users) {
    let username = u.username || u.email.split('@')[0];
    const existing = db.prepare('SELECT id FROM users WHERE username=? AND id<>?').get(username, u.id) as {id:number}|undefined;
    if (existing) username = `${username}${u.id}`;
    updateUser.run(username, nowIso(), u.id);
  }

  const complaints = db.prepare('SELECT id, reference_number, location FROM complaints').all() as Array<{id:number,reference_number:string|null,location:string|null}>;
  const updateComplaint = db.prepare('UPDATE complaints SET reference_number=?, location=COALESCE(location,?) WHERE id=?');
  for (const c of complaints) {
    updateComplaint.run(c.reference_number || `UC-${c.id.toString().padStart(6,'0')}`, c.location || 'Not specified', c.id);
  }

  const roleSeed = db.prepare('INSERT OR IGNORE INTO roles(role_name,description) VALUES (?,?)');
  for (const [r,d] of [['admin','System administrator'],['staff','University staff member'],['student','University student']] as const) roleSeed.run(r,d);
  const catSeed = db.prepare('INSERT OR IGNORE INTO categories(category_name,description) VALUES (?,?)');
  for (const c of ['IT','Facilities','Academic','Exam Hall','Safety','Finance','Student Affairs']) catSeed.run(c, `${c} complaints`);
}
