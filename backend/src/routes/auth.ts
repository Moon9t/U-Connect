import { Router } from 'express';
import { db, nowIso } from '../config/database.js';
import {
  comparePassword,
  hashPassword,
  signToken,
} from '../utils/auth.js';
import { fail, ok } from '../utils/response.js';
import {
  loginSchema,
  registerSchema,
} from '../validators/schemas.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const attempts = new Map<
  string,
  { count: number; lockedUntil: number }
>();

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return fail(res, 400, 'Invalid login payload');
  }

  const { username, password } = parsed.data;
  const key = username.toLowerCase();

  const state = attempts.get(key);

  if (state && state.lockedUntil > Date.now()) {
    return fail(res, 423, 'Account temporarily locked');
  }

  if (state && state.lockedUntil <= Date.now()) {
    attempts.delete(key);
  }

  const user = db
    .prepare(
      `SELECT
         u.user_id,
         u.username,
         u.email,
         u.password_hash,
         u.is_active,
         r.role_name
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       WHERE lower(u.username) = lower(?)`,
    )
    .get(username) as
    | {
        user_id: number;
        username: string;
        email: string;
        password_hash: string;
        is_active: number;
        role_name: string;
      }
    | undefined;

  if (
    !user ||
    !user.is_active ||
    !(await comparePassword(password, user.password_hash))
  ) {
    const current =
      attempts.get(key) || {
        count: 0,
        lockedUntil: 0,
      };

    current.count++;

    if (current.count >= 5) {
      current.lockedUntil =
        Date.now() + 15 * 60 * 1000;
      current.count = 0;
    }

    attempts.set(key, current);

    return fail(res, 401, 'Invalid username or password');
  }

  attempts.delete(key);

  const safeUser = {
    id: user.user_id,
    username: user.username,
    email: user.email,
    role: user.role_name,
  };

  return ok(res, {
    user: safeUser,
    token: signToken({
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role_name,
    }),
  });
});

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return fail(res, 400, 'Invalid registration payload');
  }

  const p = parsed.data;

  const role = db
    .prepare(
      'SELECT role_id, role_name FROM roles WHERE role_name = ?',
    )
    .get(p.role) as
    | { role_id: number; role_name: string }
    | undefined;

  if (!role) {
    return fail(res, 400, 'Invalid role');
  }

  const exists = db
    .prepare(
      `SELECT user_id
       FROM users
       WHERE lower(username) = lower(?)
          OR lower(email) = lower(?)`,
    )
    .get(p.username, p.email);

  if (exists) {
    return fail(res, 409, 'Username or email already exists');
  }

  const t = nowIso();

  const result = db
    .prepare(
      `INSERT INTO users
       (username, password_hash, email, role_id, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      p.username,
      await hashPassword(p.password),
      p.email,
      role.role_id,
      1,
      t,
    );

  const user = {
    id: Number(result.lastInsertRowid),
    username: p.username,
    email: p.email,
    role: role.role_name,
  };

  return ok(
    res,
    {
      user,
      token: signToken({
        user_id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      }),
    },
    'Registration successful',
  );
});

router.post(
  '/logout',
  authenticate,
  (_req, res) => res.status(204).send(),
);

export default router;