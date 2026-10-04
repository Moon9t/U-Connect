import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('./uconnect.db');

db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA journal_mode = WAL');

console.log('Starting UConnect SDD database migration...');

function tableExists(name) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM sqlite_master
       WHERE type = 'table'
       AND name = ?`
    )
    .get(name);

  return Number(row.count) === 1;
}

function countRows(table) {
  const row = db
    .prepare(`SELECT COUNT(*) AS count FROM ${table}`)
    .get();

  return Number(row.count);
}

try {
  /*
   * ============================================================
   * 1. Pre-migration checks
   * ============================================================
   */

  console.log('');
  console.log('Checking existing database...');

  const requiredExistingTables = [
    'users',
    'roles',
    'departments',
    'categories',
    'complaints',
    'complaint_updates',
    'attachments',
    'feedback',
    'audit_log',
  ];

  for (const table of requiredExistingTables) {
    if (!tableExists(table)) {
      throw new Error(`Required table does not exist: ${table}`);
    }

    console.log(`✓ ${table} exists`);
  }

  const originalCounts = {
    users: countRows('users'),
    roles: countRows('roles'),
    departments: countRows('departments'),
    categories: countRows('categories'),
    complaints: countRows('complaints'),
  };

  console.log('');
  console.log('Original record counts:');
  console.log(`  users:       ${originalCounts.users}`);
  console.log(`  roles:       ${originalCounts.roles}`);
  console.log(`  departments: ${originalCounts.departments}`);
  console.log(`  categories:  ${originalCounts.categories}`);
  console.log(`  complaints:  ${originalCounts.complaints}`);

  if (originalCounts.users !== 20) {
    throw new Error(
      `Expected 20 users before migration, found ${originalCounts.users}`
    );
  }

  if (originalCounts.roles !== 3) {
    throw new Error(
      `Expected 3 roles before migration, found ${originalCounts.roles}`
    );
  }

  if (originalCounts.departments !== 5) {
    throw new Error(
      `Expected 5 departments before migration, found ${originalCounts.departments}`
    );
  }

  if (originalCounts.categories !== 7) {
    throw new Error(
      `Expected 7 categories before migration, found ${originalCounts.categories}`
    );
  }

  if (originalCounts.complaints !== 523) {
    throw new Error(
      `Expected 523 complaints before migration, found ${originalCounts.complaints}`
    );
  }

  /*
   * ============================================================
   * 2. Confirm SDD role and category seed data
   * ============================================================
   */

  const expectedRoles = ['admin', 'staff', 'student'];

  for (const roleName of expectedRoles) {
    const row = db
      .prepare(
        `SELECT role_id
         FROM roles
         WHERE role_name = ?`
      )
      .get(roleName);

    if (!row) {
      throw new Error(`Required role missing: ${roleName}`);
    }
  }

  const expectedCategories = [
    'IT',
    'Facilities',
    'Academic',
    'Exam Hall',
    'Safety',
    'Finance',
    'Student Affairs',
  ];

  for (const categoryName of expectedCategories) {
    const row = db
      .prepare(
        `SELECT category_id
         FROM categories
         WHERE category_name = ?`
      )
      .get(categoryName);

    if (!row) {
      throw new Error(`Required category missing: ${categoryName}`);
    }
  }

  console.log('✓ Roles verified');
  console.log('✓ Categories verified');

  /*
   * ============================================================
   * 3. Begin migration transaction
   * ============================================================
   */

  db.exec('BEGIN');

  /*
   * ============================================================
   * 4. Preserve existing tables
   *
   * Parent tables are renamed first.
   * Existing SDD-related dependent tables are also preserved.
   *
   * comments and notifications are intentionally left untouched
   * because they are existing application tables outside the
   * SDD database entity list.
   * ============================================================
   */

  db.exec('ALTER TABLE users RENAME TO users_legacy');

  db.exec(
    'ALTER TABLE departments RENAME TO departments_legacy'
  );

  db.exec(
    'ALTER TABLE complaints RENAME TO complaints_legacy'
  );

  db.exec(
    'ALTER TABLE complaint_updates RENAME TO complaint_updates_legacy'
  );

  db.exec(
    'ALTER TABLE attachments RENAME TO attachments_legacy'
  );

  db.exec(
    'ALTER TABLE feedback RENAME TO feedback_legacy'
  );

  db.exec(
    'ALTER TABLE audit_log RENAME TO audit_log_legacy'
  );

  console.log('');
  console.log('✓ Existing tables preserved as legacy tables');

  /*
   * ============================================================
   * 5. Create SDD users table
   * ============================================================
   */

  db.exec(`
    CREATE TABLE users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      email TEXT UNIQUE,
      role_id INTEGER,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME,
      FOREIGN KEY (role_id)
        REFERENCES roles(role_id)
    )
  `);

  /*
   * ============================================================
   * 6. Create SDD departments table
   * ============================================================
   */

  db.exec(`
    CREATE TABLE departments (
      department_id INTEGER PRIMARY KEY AUTOINCREMENT,
      department_name TEXT UNIQUE NOT NULL,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME
    )
  `);

  /*
   * ============================================================
   * 7. Create SDD complaints table
   * ============================================================
   */

  db.exec(`
    CREATE TABLE complaints (
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
    )
  `);

  /*
   * ============================================================
   * 8. Migrate departments
   * ============================================================
   */

  db.prepare(`
    INSERT INTO departments (
      department_id,
      department_name,
      description,
      is_active,
      created_at
    )
    SELECT
      id,
      name,
      description,
      1,
      created_at
    FROM departments_legacy
  `).run();

  /*
   * ============================================================
   * 9. Migrate users
   *
   * Legacy role text:
   *   admin   -> roles.role_id for admin
   *   staff   -> roles.role_id for staff
   *   student -> roles.role_id for student
   * ============================================================
   */

  db.prepare(`
    INSERT INTO users (
      user_id,
      username,
      password_hash,
      email,
      role_id,
      is_active,
      created_at
    )
    SELECT
      u.id,
      u.username,
      u.password_hash,
      u.email,
      r.role_id,
      u.is_active,
      u.created_at
    FROM users_legacy u
    INNER JOIN roles r
      ON r.role_name = u.role
  `).run();

  /*
   * ============================================================
   * 10. Migrate complaints
   *
   * Legacy:
   *   id          -> complaint_id
   *   category    -> category_id
   *   created_at  -> submitted_at
   * ============================================================
   */

  db.prepare(`
    INSERT INTO complaints (
      complaint_id,
      reference_number,
      user_id,
      category_id,
      department_id,
      title,
      description,
      location,
      priority,
      status,
      submitted_at
    )
    SELECT
      c.id,
      c.reference_number,
      c.user_id,
      cat.category_id,
      c.department_id,
      c.title,
      c.description,
      c.location,
      c.priority,
      c.status,
      c.created_at
    FROM complaints_legacy c
    INNER JOIN categories cat
      ON cat.category_name = c.category
  `).run();

  /*
   * ============================================================
   * 11. Create SDD complaint_updates table
   * ============================================================
   */

  db.exec(`
    CREATE TABLE complaint_updates (
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
    )
  `);

  /*
   * ============================================================
   * 12. Create SDD attachments table
   * ============================================================
   */

  db.exec(`
    CREATE TABLE attachments (
      attachment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT,
      uploaded_at TEXT NOT NULL,
      FOREIGN KEY (complaint_id)
        REFERENCES complaints(complaint_id)
        ON DELETE CASCADE
    )
  `);

  /*
   * ============================================================
   * 13. Create SDD feedback table
   * ============================================================
   */

  db.exec(`
    CREATE TABLE feedback (
      feedback_id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT,
      submitted_at TEXT NOT NULL,
      UNIQUE(complaint_id, user_id),
      FOREIGN KEY (complaint_id)
        REFERENCES complaints(complaint_id)
        ON DELETE CASCADE,
      FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
    )
  `);

  /*
   * ============================================================
   * 14. Create SDD audit_log table
   * ============================================================
   */

  db.exec(`
    CREATE TABLE audit_log (
      log_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      table_affected TEXT NOT NULL,
      record_id INTEGER,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL
    )
  `);

  /*
   * ============================================================
   * 15. Create useful indexes
   * ============================================================
   */

    db.exec(`
    CREATE INDEX idx_sdd_complaints_reference_number
    ON complaints(reference_number)
  `);

    db.exec(`
    CREATE INDEX idx_sdd_complaints_user_id
    ON complaints(user_id)
  `);

    db.exec(`
    CREATE INDEX idx_sdd_complaints_department_id
    ON complaints(department_id)
  `);

    db.exec(`
    CREATE INDEX idx_sdd_complaints_submitted_at
    ON complaints(submitted_at)
  `);

  /*
   * ============================================================
   * 16. Verify migrated record counts
   * ============================================================
   */

  console.log('');
  console.log('Verifying migrated records...');

  const expected = {
    users: 20,
    departments: 5,
    complaints: 523,
    roles: 3,
    categories: 7,
  };

  for (const [table, expectedCount] of Object.entries(expected)) {
    const actual = countRows(table);

    if (actual !== expectedCount) {
      throw new Error(
        `${table}: expected ${expectedCount}, got ${actual}`
      );
    }

    console.log(`✓ ${table}: ${actual}`);
  }

  /*
   * ============================================================
   * 17. Verify role mapping
   * ============================================================
   */

  const roleMapping = db
    .prepare(`
      SELECT
        r.role_name,
        COUNT(*) AS count
      FROM users u
      INNER JOIN roles r
        ON r.role_id = u.role_id
      GROUP BY r.role_name
      ORDER BY r.role_id
    `)
    .all();

  console.log('');
  console.log('Role mapping:');
  console.table(roleMapping);

  const invalidRoles = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM users
      WHERE role_id IS NULL
    `)
    .get();

  if (Number(invalidRoles.count) !== 0) {
    throw new Error('Some users have no valid role_id');
  }

  /*
   * ============================================================
   * 18. Verify category mapping
   * ============================================================
   */

  const categoryMapping = db
    .prepare(`
      SELECT
        cat.category_name,
        COUNT(c.complaint_id) AS count
      FROM categories cat
      LEFT JOIN complaints c
        ON c.category_id = cat.category_id
      GROUP BY cat.category_id
      ORDER BY cat.category_id
    `)
    .all();

  console.log('');
  console.log('Category mapping:');
  console.table(categoryMapping);

  const invalidCategories = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM complaints
      WHERE category_id IS NULL
    `)
    .get();

  if (Number(invalidCategories.count) !== 0) {
    throw new Error(
      'Some complaints have no valid category_id'
    );
  }

  /*
   * ============================================================
   * 19. Verify department mapping
   * ============================================================
   */

  const departmentMapping = db
    .prepare(`
      SELECT
        d.department_id,
        d.department_name,
        COUNT(c.complaint_id) AS complaint_count
      FROM departments d
      LEFT JOIN complaints c
        ON c.department_id = d.department_id
      GROUP BY d.department_id
      ORDER BY d.department_id
    `)
    .all();

  console.log('');
  console.log('Department mapping:');
  console.table(departmentMapping);

  const invalidDepartments = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM complaints
      WHERE department_id IS NULL
    `)
    .get();

  if (Number(invalidDepartments.count) !== 0) {
    throw new Error(
      'Some complaints have no valid department_id'
    );
  }

  /*
   * ============================================================
   * 20. Verify reference numbers
   * ============================================================
   */

  const referenceCheck = db
    .prepare(`
      SELECT
        COUNT(*) AS total,
        COUNT(reference_number) AS with_reference,
        COUNT(DISTINCT reference_number) AS unique_references
      FROM complaints
    `)
    .get();

  if (
    Number(referenceCheck.total) !== 523 ||
    Number(referenceCheck.with_reference) !== 523 ||
    Number(referenceCheck.unique_references) !== 523
  ) {
    throw new Error(
      'Complaint reference number validation failed'
    );
  }

  console.log('✓ Complaint reference numbers verified');

  /*
   * ============================================================
   * 21. Verify foreign keys
   * ============================================================
   */

  const fkErrors = db
    .prepare(`
      PRAGMA foreign_key_check
    `)
    .all();

  if (fkErrors.length !== 0) {
    console.table(fkErrors);
    throw new Error('Foreign key validation failed');
  }

  console.log('✓ Foreign key validation passed');

  /*
   * ============================================================
   * 22. Verify required SDD tables
   * ============================================================
   */

  const sddTables = [
    'users',
    'roles',
    'departments',
    'categories',
    'complaints',
    'complaint_updates',
    'attachments',
    'feedback',
    'audit_log',
  ];

  for (const table of sddTables) {
    if (!tableExists(table)) {
      throw new Error(
        `Required SDD table was not created: ${table}`
      );
    }
  }

  console.log('✓ All 9 SDD tables exist');

  /*
   * ============================================================
   * 23. Verify preserved legacy tables
   * ============================================================
   */

  const legacyTables = [
    'users_legacy',
    'departments_legacy',
    'complaints_legacy',
    'complaint_updates_legacy',
    'attachments_legacy',
    'feedback_legacy',
    'audit_log_legacy',
  ];

  for (const table of legacyTables) {
    if (!tableExists(table)) {
      throw new Error(
        `Legacy preservation table missing: ${table}`
      );
    }
  }

  console.log('✓ Legacy tables preserved');

  /*
   * ============================================================
   * 24. Commit
   * ============================================================
   */

  db.exec('COMMIT');

  console.log('');
  console.log('========================================');
  console.log('SDD DATABASE MIGRATION SUCCESSFUL');
  console.log('========================================');
  console.log('');
  console.log('SDD tables created:');
  console.log('  users');
  console.log('  roles');
  console.log('  departments');
  console.log('  categories');
  console.log('  complaints');
  console.log('  complaint_updates');
  console.log('  attachments');
  console.log('  feedback');
  console.log('  audit_log');
  console.log('');
  console.log('Original tables preserved as:');
  console.log('  users_legacy');
  console.log('  departments_legacy');
  console.log('  complaints_legacy');
  console.log('  complaint_updates_legacy');
  console.log('  attachments_legacy');
  console.log('  feedback_legacy');
  console.log('  audit_log_legacy');
  console.log('');
  console.log('Existing comments and notifications tables were preserved.');
  console.log('');
  console.log('Database backup:');
  console.log('  uconnect_before_sdd_migration.db');
  console.log('');

} catch (error) {
  console.error('');
  console.error('========================================');
  console.error('MIGRATION FAILED');
  console.error('========================================');
  console.error(error);

  try {
    db.exec('ROLLBACK');
  } catch {}

  process.exitCode = 1;
}
