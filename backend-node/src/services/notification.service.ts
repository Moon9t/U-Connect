import { DatabaseSync } from 'node:sqlite';
import { Notification } from '../models/types';

export class NotificationService {
  constructor(private db: DatabaseSync) {}

  list(userId: number): Notification[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM notifications
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 100`
      )
      .all(userId) as any[];

    return rows.map((r) => ({
      id: Number(r.id),
      user_id: Number(r.user_id),
      type: r.type,
      title: r.title,
      description: r.description,
      related_complaint_id: r.related_complaint_id ? Number(r.related_complaint_id) : null,
      read_at: r.read_at,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  markRead(id: number, userId: number): void {
    const existing = this.db
      .prepare('SELECT id FROM notifications WHERE id = ? AND user_id = ?')
      .get(id, userId);

    if (!existing) {
      throw new Error('notification not found');
    }

    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE notifications SET read_at = ?, updated_at = ? WHERE id = ?')
      .run(now, now, id);
  }

  markAllRead(userId: number): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        'UPDATE notifications SET read_at = ?, updated_at = ? WHERE user_id = ? AND read_at IS NULL'
      )
      .run(now, now, userId);
  }

  create(
    userId: number,
    type: string,
    title: string,
    description: string,
    relatedComplaintId?: number | null
  ): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO notifications (user_id, type, title, description, related_complaint_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(userId, type, title, description, relatedComplaintId || null, now, now);
  }
}
