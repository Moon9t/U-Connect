import { Router } from 'express';
import { db, nowIso } from '../config/database.js';
import {
  authenticate,
  requireRole,
} from '../middleware/auth.js';
import { hashPassword } from '../utils/auth.js';
import { fail, ok } from '../utils/response.js';
import { audit } from '../services/audit.js';

const router = Router();

router.use(
  authenticate,
  requireRole('admin'),
);

router.get('/users', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT
         u.user_id AS id,
         u.username,
         u.email,
         r.role_name AS role,
         u.is_active,
         u.created_at
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       ORDER BY u.created_at DESC`,
    )
    .all();

  return ok(res, rows);
});

router.post('/users', async (req, res) => {
  const {
    username,
    email,
    password,
    role = 'student',
  } = req.body || {};

  if (!username || !email || !password) {
    return fail(
      res,
      400,
      'username, email and password are required',
    );
  }

  if (
    !['admin', 'staff', 'student'].includes(role)
  ) {
    return fail(res, 400, 'Invalid role');
  }

  const roleRow = db
    .prepare(
      'SELECT role_id, role_name FROM roles WHERE role_name=?',
    )
    .get(role) as
    | {
        role_id: number;
        role_name: string;
      }
    | undefined;

  if (!roleRow) {
    return fail(res, 400, 'Invalid role');
  }

  const existing = db
    .prepare(
      `SELECT user_id
       FROM users
       WHERE lower(username) = lower(?)
          OR lower(email) = lower(?)`,
    )
    .get(username, email);

  if (existing) {
    return fail(
      res,
      409,
      'Username or email already exists',
    );
  }

  const t = nowIso();

  const result = db
    .prepare(
      `INSERT INTO users
       (username, password_hash, email, role_id, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      username,
      await hashPassword(password),
      email,
      roleRow.role_id,
      1,
      t,
    );

  const id = Number(result.lastInsertRowid);

  audit(
    req.user!.user_id,
    'CREATE',
    'users',
    id,
  );

  return ok(res, {
    id,
    username,
    email,
    role: roleRow.role_name,
    is_active: 1,
    created_at: t,
  });
});

router.put('/users/:id/role', (req, res) => {
  const id = Number(req.params.id);
  const role = req.body?.role;

  if (
    !['admin', 'staff', 'student'].includes(role)
  ) {
    return fail(res, 400, 'Invalid role');
  }

  const roleRow = db
    .prepare(
      'SELECT role_id, role_name FROM roles WHERE role_name=?',
    )
    .get(role) as
    | {
        role_id: number;
        role_name: string;
      }
    | undefined;

  if (!roleRow) {
    return fail(res, 400, 'Invalid role');
  }

  const result = db
    .prepare(
      'UPDATE users SET role_id=? WHERE user_id=?',
    )
    .run(roleRow.role_id, id);

  if (!result.changes) {
    return fail(res, 404, 'User not found');
  }

  audit(
    req.user!.user_id,
    'UPDATE_ROLE',
    'users',
    id,
  );

  return ok(res, {
    message: 'User role updated successfully',
  });
});

router.put(
  '/users/:id/deactivate',
  (req, res) => {
    const id = Number(req.params.id);

    if (id === req.user!.user_id) {
      return fail(
        res,
        400,
        'Administrators cannot deactivate their own account',
      );
    }

    const result = db
      .prepare(
        'UPDATE users SET is_active=0 WHERE user_id=?',
      )
      .run(id);

    if (!result.changes) {
      return fail(res, 404, 'User not found');
    }

    audit(
      req.user!.user_id,
      'DEACTIVATE',
      'users',
      id,
    );

    return ok(res, {
      message: 'User account deactivated successfully',
    });
  },
);

export default router;
