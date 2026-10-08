import { DatabaseSync } from 'node:sqlite';

import { User, Role } from '../models/types';

import { hashPassword, comparePassword } from '../utils/password';

import { generateToken } from '../utils/jwt';

export interface RegisterDTO {
  name: string;

  email: string;

  password: string;

  role?: Role;

  department_id?: number | null;
}

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export class AuthService {
  constructor(private db: DatabaseSync) {}

  async register(
    data: RegisterDTO
  ): Promise<{ user: Partial<User>; token: string }> {
    const role: Role = data.role || 'student';

    if (!['student', 'staff', 'admin'].includes(role)) {
      throw new Error(
        'invalid role specified. Allowed: admin, staff, student'
      );
    }

    const existing = this.db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(data.email);

    if (existing) {
      throw new Error('email already registered');
    }

    const passwordHash = await hashPassword(data.password);

    const now = new Date().toISOString();

    const result = this.db
      .prepare(
        `INSERT INTO users (
          name,
          email,
          password_hash,
          role,
          department_id,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.name,
        data.email,
        passwordHash,
        role,
        data.department_id || null,
        now,
        now
      );

    const userId = Number(result.lastInsertRowid);

    const user: Partial<User> = {
      id: userId,
      name: data.name,
      email: data.email,
      role,
      department_id: data.department_id || null,
      created_at: now,
      updated_at: now,
    };

    const token = generateToken({
      user_id: userId,
      email: data.email,
      role,
    });

    return { user, token };
  }

  async login(
    identifier: string,
    password: string
  ): Promise<{ user: Partial<User>; token: string }> {
    const cols = this.db.prepare('PRAGMA table_info(users)').all() as Array<{
      name: string;
    }>;

    let row: any;

    if (cols.some((c) => c.name === 'username')) {
      row = this.db
        .prepare(
          'SELECT * FROM users WHERE lower(email) = lower(?) OR lower(username) = lower(?)'
        )
        .get(identifier, identifier) as any;
    } else {
      row = this.db
        .prepare(
          'SELECT * FROM users WHERE lower(email) = lower(?) OR lower(email) LIKE lower(?)'
        )
        .get(identifier, `${identifier}@%`) as any;
    }

    /*
     * Do not reveal whether an account exists when the identifier
     * is unknown. This preserves the existing authentication behavior.
     */
    if (!row) {
      throw new Error('invalid email or password');
    }

    /*
     * NFR02:
     * Lock the account for 15 minutes after five failed login attempts.
     */
    const now = Date.now();

    const lockedUntil = row.locked_until
      ? new Date(row.locked_until).getTime()
      : null;

    if (lockedUntil && lockedUntil > now) {
      throw new Error(
        'account locked due to multiple failed login attempts. Please try again later.'
      );
    }

    /*
     * If the previous lock has expired, reset the failed-attempt counter
     * before allowing another authentication attempt.
     */
    if (
      row.locked_until &&
      (!lockedUntil || lockedUntil <= now)
    ) {
      this.db
        .prepare(
          `UPDATE users
           SET failed_login_attempts = 0,
               locked_until = NULL,
               updated_at = ?
           WHERE id = ?`
        )
        .run(new Date().toISOString(), row.id);

      row.failed_login_attempts = 0;
      row.locked_until = null;
    }

    if (row.is_active === 0 || row.is_active === false) {
      throw new Error(
        'Account has been deactivated. Please contact an administrator.'
      );
    }

    const isValid = await comparePassword(
      password,
      row.password_hash
    );

    /*
     * Invalid password:
     * increment the failed-login counter.
     */
    if (!isValid) {
      const failedAttempts =
        Number(row.failed_login_attempts || 0) + 1;

      if (failedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
        const lockUntil = new Date(
          now + LOCKOUT_DURATION_MINUTES * 60 * 1000
        ).toISOString();

        this.db
          .prepare(
            `UPDATE users
             SET failed_login_attempts = ?,
                 locked_until = ?,
                 updated_at = ?
             WHERE id = ?`
          )
          .run(
            MAX_FAILED_LOGIN_ATTEMPTS,
            lockUntil,
            new Date().toISOString(),
            row.id
          );

        throw new Error(
          'account locked due to multiple failed login attempts. Please try again in 15 minutes.'
        );
      }

      this.db
        .prepare(
          `UPDATE users
           SET failed_login_attempts = ?,
               updated_at = ?
           WHERE id = ?`
        )
        .run(
          failedAttempts,
          new Date().toISOString(),
          row.id
        );

      throw new Error('invalid email or password');
    }

    /*
     * Successful login:
     * reset the failed-login counter and remove any lock.
     */
    this.db
      .prepare(
        `UPDATE users
         SET failed_login_attempts = 0,
             locked_until = NULL,
             updated_at = ?
         WHERE id = ?`
      )
      .run(new Date().toISOString(), row.id);

    const user: Partial<User> = {
      id: Number(row.id),

      name: row.name,

      username:
        row.username ||
        (row.email.includes('@')
          ? row.email.split('@')[0]
          : row.email),

      email: row.email,

      role: row.role as Role,

      department_id: row.department_id
        ? Number(row.department_id)
        : null,

      is_active: row.is_active !== 0,

      created_at: row.created_at,

      updated_at: row.updated_at,
    };

    // Attach department if present
    if (user.department_id) {
      const dept = this.db
        .prepare(
          'SELECT id, name, code, description FROM departments WHERE id = ?'
        )
        .get(user.department_id) as any;

      if (dept) {
        user.department = {
          id: Number(dept.id),
          name: dept.name,
          code: dept.code,
          description: dept.description,
          created_at: dept.created_at,
          updated_at: dept.updated_at,
        };
      }
    }

    const token = generateToken({
      user_id: user.id!,
      email: user.email!,
      role: user.role!,
    });

    return { user, token };
  }

  getAllUsers(): Partial<User>[] {
    const rows = this.db
      .prepare(
        `SELECT
          u.id,
          u.name,
          u.email,
          u.role,
          u.department_id,
          u.is_active,
          u.created_at,
          u.updated_at,
          d.id as dept_id,
          d.name as dept_name,
          d.code as dept_code,
          d.description as dept_desc
         FROM users u
         LEFT JOIN departments d ON u.department_id = d.id
         ORDER BY u.id ASC`
      )
      .all() as any[];

    return rows.map((r) => ({
      id: Number(r.id),
      name: r.name,
      email: r.email,
      role: r.role as Role,
      department_id: r.department_id
        ? Number(r.department_id)
        : null,
      is_active: r.is_active !== 0,
      created_at: r.created_at,
      updated_at: r.updated_at,

      department: r.dept_id
        ? {
            id: Number(r.dept_id),
            name: r.dept_name,
            code: r.dept_code,
            description: r.dept_desc,
            created_at: '',
            updated_at: '',
          }
        : null,
    }));
  }

  async createUser(data: {
    name: string;

    email: string;

    password?: string;

    role?: Role;

    department_id?: number | null;
  }): Promise<Partial<User>> {
    if (!data.name || !data.email) {
      throw new Error('name and email are required');
    }

    const role: Role = data.role || 'student';

    if (!['student', 'staff', 'admin'].includes(role)) {
      throw new Error(
        'invalid role specified. Allowed: admin, staff, student'
      );
    }

    const existing = this.db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(data.email);

    if (existing) {
      throw new Error('email already registered');
    }

    const plainPassword =
      data.password && data.password.trim()
        ? data.password.trim()
        : 'password123';

    const passwordHash = await hashPassword(plainPassword);

    const now = new Date().toISOString();

    const result = this.db
      .prepare(
        `INSERT INTO users (
          name,
          email,
          password_hash,
          role,
          department_id,
          is_active,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .run(
        data.name.trim(),
        data.email.trim().toLowerCase(),
        passwordHash,
        role,
        data.department_id || null,
        now,
        now
      );

    const userId = Number(result.lastInsertRowid);

    let department = null;

    if (data.department_id) {
      const dept = this.db
        .prepare(
          'SELECT id, name, code, description FROM departments WHERE id = ?'
        )
        .get(data.department_id) as any;

      if (dept) {
        department = {
          id: Number(dept.id),
          name: dept.name,
          code: dept.code,
          description: dept.description,
          created_at: dept.created_at,
          updated_at: dept.updated_at,
        };
      }
    }

    return {
      id: userId,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      role,
      department_id: data.department_id || null,
      department,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
  }

  toggleUserActive(userId: number, isActive: boolean): void {
    const existing = this.db
      .prepare('SELECT id, email, role FROM users WHERE id = ?')
      .get(userId) as any;

    if (!existing) {
      throw new Error('user not found');
    }

    // Protect primary root admin from deactivation
    if (existing.email === 'admin@test.com' || existing.id === 1) {
      if (!isActive) {
        throw new Error(
          'Cannot deactivate the root system administrator account'
        );
      }
    }

    this.db
      .prepare(
        'UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?'
      )
      .run(
        isActive ? 1 : 0,
        new Date().toISOString(),
        userId
      );
  }

  deleteUser(userId: number): void {
    const existing = this.db
      .prepare('SELECT id, email, role FROM users WHERE id = ?')
      .get(userId) as any;

    if (!existing) {
      throw new Error('user not found');
    }

    if (existing.email === 'admin@test.com' || existing.id === 1) {
      throw new Error(
        'Cannot delete the root system administrator account'
      );
    }

    this.db
      .prepare('DELETE FROM users WHERE id = ?')
      .run(userId);
  }

  updateUserRole(userId: number, role: string): void {
    if (!['admin', 'staff', 'student'].includes(role)) {
      throw new Error(
        'invalid role specified. Allowed: admin, staff, student'
      );
    }

    const existing = this.db
      .prepare('SELECT id FROM users WHERE id = ?')
      .get(userId);

    if (!existing) {
      throw new Error('user not found');
    }

    this.db
      .prepare(
        'UPDATE users SET role = ?, updated_at = ? WHERE id = ?'
      )
      .run(
        role,
        new Date().toISOString(),
        userId
      );
  }
}