import { Router } from 'express';
import { db } from '../config/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { audit } from '../services/audit.js';
import { fail, ok } from '../utils/response.js';

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT
         department_id,
         department_name,
         description,
         is_active,
         created_at
       FROM departments
       ORDER BY department_name`
    )
    .all();

  return ok(res, rows);
});

router.post('/', requireRole('admin'), (req, res) => {
  const departmentName =
    typeof req.body.department_name === 'string'
      ? req.body.department_name.trim()
      : '';

  const description =
    typeof req.body.description === 'string'
      ? req.body.description.trim()
      : null;

  if (!departmentName) {
    return fail(res, 400, 'Department name is required');
  }

  const createdAt = new Date().toISOString();

  try {
    const result = db
      .prepare(
        `INSERT INTO departments (
           department_name,
           description,
           is_active,
           created_at
         )
         VALUES (?, ?, 1, ?)`
      )
      .run(
        departmentName,
        description || null,
        createdAt
      );

    const departmentId = Number(result.lastInsertRowid);

    audit(
      req.user!.user_id,
      'CREATE',
      'departments',
      departmentId
    );

    const department = db
      .prepare(
        `SELECT
           department_id,
           department_name,
           description,
           is_active,
           created_at
         FROM departments
         WHERE department_id = ?`
      )
      .get(departmentId);

    return ok(res, department);
  } catch {
    return fail(res, 409, 'Department name already exists');
  }
});

router.put('/:id', requireRole('admin'), (req, res) => {
  const departmentId = Number(req.params.id);

  if (!Number.isInteger(departmentId) || departmentId <= 0) {
    return fail(res, 400, 'Invalid department ID');
  }

  const existing = db
    .prepare(
      `SELECT
         department_id,
         department_name,
         description,
         is_active,
         created_at
       FROM departments
       WHERE department_id = ?`
    )
    .get(departmentId) as
    | {
        department_id: number;
        department_name: string;
        description: string | null;
        is_active: number;
        created_at: string;
      }
    | undefined;

  if (!existing) {
    return fail(res, 404, 'Department not found');
  }

  const departmentName =
    typeof req.body.department_name === 'string'
      ? req.body.department_name.trim()
      : existing.department_name;

  const description =
    req.body.description !== undefined
      ? typeof req.body.description === 'string'
        ? req.body.description.trim()
        : null
      : existing.description;

  const isActive =
    req.body.is_active !== undefined
      ? req.body.is_active
        ? 1
        : 0
      : existing.is_active;

  if (!departmentName) {
    return fail(res, 400, 'Department name is required');
  }

  try {
    db.prepare(
      `UPDATE departments
       SET
         department_name = ?,
         description = ?,
         is_active = ?
       WHERE department_id = ?`
    ).run(
      departmentName,
      description || null,
      isActive,
      departmentId
    );

    audit(
      req.user!.user_id,
      'UPDATE',
      'departments',
      departmentId
    );

    const department = db
      .prepare(
        `SELECT
           department_id,
           department_name,
           description,
           is_active,
           created_at
         FROM departments
         WHERE department_id = ?`
      )
      .get(departmentId);

    return ok(res, department);
  } catch {
    return fail(res, 409, 'Department name already exists');
  }
});

router.delete('/:id', requireRole('admin'), (req, res) => {
  const departmentId = Number(req.params.id);

  if (!Number.isInteger(departmentId) || departmentId <= 0) {
    return fail(res, 400, 'Invalid department ID');
  }

  const department = db
    .prepare(
      `SELECT department_id
       FROM departments
       WHERE department_id = ?`
    )
    .get(departmentId);

  if (!department) {
    return fail(res, 404, 'Department not found');
  }

  try {
    db.prepare(
      `DELETE FROM departments
       WHERE department_id = ?`
    ).run(departmentId);

    audit(
      req.user!.user_id,
      'DELETE',
      'departments',
      departmentId
    );

    return ok(res, {
      message: 'Department deleted successfully',
    });
  } catch {
    return fail(
      res,
      409,
      'Department cannot be deleted because it is referenced by existing records'
    );
  }
});

export default router;