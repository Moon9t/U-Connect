import { DatabaseSync } from 'node:sqlite';
import { Department } from '../models/types';

export class DepartmentService {
  constructor(private db: DatabaseSync) {}

  list(): Department[] {
    const rows = this.db.prepare('SELECT * FROM departments ORDER BY name ASC').all() as any[];
    return rows.map((r) => ({
      id: Number(r.id),
      name: r.name,
      code: r.code,
      description: r.description || '',
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  getById(id: number): Department | null {
    const row = this.db.prepare('SELECT * FROM departments WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: Number(row.id),
      name: row.name,
      code: row.code,
      description: row.description || '',
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  create(data: { name: string; code: string; description?: string }): Department {
    if (!data.name || !data.code) {
      throw new Error('department name and code are required');
    }

    const existing = this.db.prepare('SELECT id FROM departments WHERE code = ?').get(data.code);
    if (existing) {
      throw new Error('department code already exists');
    }

    const now = new Date().toISOString();
    const result = this.db
      .prepare(
        `INSERT INTO departments (name, code, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(data.name, data.code, data.description || '', now, now);

    return {
      id: Number(result.lastInsertRowid),
      name: data.name,
      code: data.code,
      description: data.description || '',
      created_at: now,
      updated_at: now,
    };
  }

  update(id: number, data: { name?: string; code?: string; description?: string }): Department {
    const existing = this.getById(id);
    if (!existing) {
      throw new Error('department not found');
    }

    if (data.code && data.code !== existing.code) {
      const codeCheck = this.db
        .prepare('SELECT id FROM departments WHERE code = ? AND id != ?')
        .get(data.code, id);
      if (codeCheck) {
        throw new Error('department code already exists');
      }
    }

    const name = data.name !== undefined ? data.name : existing.name;
    const code = data.code !== undefined ? data.code : existing.code;
    const description = data.description !== undefined ? data.description : existing.description;
    const now = new Date().toISOString();

    this.db
      .prepare(
        `UPDATE departments
         SET name = ?, code = ?, description = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(name, code, description, now, id);

    return {
      id,
      name,
      code,
      description,
      created_at: existing.created_at,
      updated_at: now,
    };
  }

  delete(id: number): void {
    const existing = this.getById(id);
    if (!existing) {
      throw new Error('department not found');
    }

    // Check if complaints reference this department
    const complaintRef = this.db
      .prepare('SELECT COUNT(*) as count FROM complaints WHERE department_id = ?')
      .get(id) as any;
    if (complaintRef && Number(complaintRef.count) > 0) {
      throw new Error('cannot delete department with associated complaints');
    }

    this.db.prepare('DELETE FROM departments WHERE id = ?').run(id);
  }
}
