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

export class AuthService {
  constructor(private db: DatabaseSync) {}

  async register(data: RegisterDTO): Promise<{ user: Partial<User>; token: string }> {
    const role: Role = data.role || 'student';
    if (!['student', 'staff', 'admin'].includes(role)) {
      throw new Error('invalid role specified. Allowed: admin, staff, student');
    }

    const existing = this.db.prepare('SELECT id FROM users WHERE email = ?').get(data.email);
    if (existing) {
      throw new Error('email already registered');
    }

    const passwordHash = await hashPassword(data.password);
    const now = new Date().toISOString();

    const result = this.db
      .prepare(
        `INSERT INTO users (name, email, password_hash, role, department_id, created_at, updated_at)
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

  async login(email: string, password: string): Promise<{ user: Partial<User>; token: string }> {
    const row = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!row) {
      throw new Error('invalid email or password');
    }

    if (row.is_active === 0 || row.is_active === false) {
      throw new Error('Account has been deactivated. Please contact an administrator.');
    }

    const isValid = await comparePassword(password, row.password_hash);
    if (!isValid) {
      throw new Error('invalid email or password');
    }

    const user: Partial<User> = {
      id: Number(row.id),
      name: row.name,
      email: row.email,
      role: row.role as Role,
      department_id: row.department_id ? Number(row.department_id) : null,
      is_active: row.is_active !== 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    // Attach department if present
    if (user.department_id) {
      const dept = this.db
        .prepare('SELECT id, name, code, description FROM departments WHERE id = ?')
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
        `SELECT u.id, u.name, u.email, u.role, u.department_id, u.is_active, u.created_at, u.updated_at,
                d.id as dept_id, d.name as dept_name, d.code as dept_code, d.description as dept_desc
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
      department_id: r.department_id ? Number(r.department_id) : null,
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
      throw new Error('invalid role specified. Allowed: admin, staff, student');
    }

    const existing = this.db.prepare('SELECT id FROM users WHERE email = ?').get(data.email);
    if (existing) {
      throw new Error('email already registered');
    }

    const plainPassword = data.password && data.password.trim() ? data.password.trim() : 'password123';
    const passwordHash = await hashPassword(plainPassword);
    const now = new Date().toISOString();

    const result = this.db
      .prepare(
        `INSERT INTO users (name, email, password_hash, role, department_id, is_active, created_at, updated_at)
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
        .prepare('SELECT id, name, code, description FROM departments WHERE id = ?')
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
    const existing = this.db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(userId) as any;
    if (!existing) {
      throw new Error('user not found');
    }

    // Protect primary root admin from deactivation
    if (existing.email === 'admin@test.com' || existing.id === 1) {
      if (!isActive) {
        throw new Error('Cannot deactivate the root system administrator account');
      }
    }

    this.db
      .prepare('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?')
      .run(isActive ? 1 : 0, new Date().toISOString(), userId);
  }

  deleteUser(userId: number): void {
    const existing = this.db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(userId) as any;
    if (!existing) {
      throw new Error('user not found');
    }

    if (existing.email === 'admin@test.com' || existing.id === 1) {
      throw new Error('Cannot delete the root system administrator account');
    }

    this.db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  }

  updateUserRole(userId: number, role: string): void {
    if (!['admin', 'staff', 'student'].includes(role)) {
      throw new Error('invalid role specified. Allowed: admin, staff, student');
    }

    const existing = this.db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!existing) {
      throw new Error('user not found');
    }

    this.db
      .prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?')
      .run(role, new Date().toISOString(), userId);
  }
}
