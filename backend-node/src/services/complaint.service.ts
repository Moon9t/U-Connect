import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { Complaint, Comment, Role, Status, Category, Priority, Attachment } from '../models/types';
import {
  calculatePriority,
  canTransition,
  maskComplaintForRole,
  isSLABreached,
  SLA_DURATION_HOURS,
} from './complaint.rules';
import { NotificationService } from './notification.service';
import { UPLOAD_DIR } from '../middleware/upload';
import { generateComplaintsPdf } from '../utils/pdfReport';

export interface CreateComplaintDTO {
  title: string;
  description: string;
  category: Category;
  department_id: number;
  anonymous?: boolean;
}

export interface ComplaintFilterDTO {
  status?: string;
  category?: string;
  priority?: string;
  department_id?: number;
  sla_escalated?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

export class ComplaintService {
  constructor(
    private db: DatabaseSync,
    private notificationService: NotificationService
  ) {}

  createComplaint(
    userId: number,
    requestingRole: Role,
    data: CreateComplaintDTO,
    files?: Express.Multer.File[]
  ): { complaint: Complaint; message: string } {
    if (!data.title || !data.description || !data.category || !data.department_id) {
      throw new Error('title, description, category, and department_id are required');
    }

    const deptId = Number(data.department_id);
    if (isNaN(deptId)) {
      throw new Error('invalid department_id');
    }

    const dept = this.db.prepare('SELECT id FROM departments WHERE id = ?').get(deptId);
    if (!dept) {
      throw new Error('department not found');
    }

    // Rule 1: Priority Auto-Escalation
    const priority = calculatePriority(data.description, data.category);
    const now = new Date().toISOString();
    const isAnonymous = data.anonymous === true || String(data.anonymous) === 'true';

    const result = this.db
      .prepare(
        `INSERT INTO complaints (
           title, description, category, priority, status, anonymous, sla_escalated,
           user_id, department_id, resolved_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.title,
        data.description,
        data.category,
        priority,
        'pending',
        isAnonymous ? 1 : 0,
        0,
        userId,
        deptId,
        null,
        now,
        now
      );

    const complaintId = Number(result.lastInsertRowid);

    // Save attachments if any
    if (files && files.length > 0) {
      const insertAtt = this.db.prepare(`
        INSERT INTO attachments (complaint_id, file_name, file_size, file_type, file_path, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const file of files) {
        insertAtt.run(
          complaintId,
          file.originalname,
          file.size,
          file.mimetype,
          file.filename,
          now
        );
      }
    }

    // Notify user
    this.notificationService.create(
      userId,
      'complaint_created',
      'Complaint Submitted',
      `Your complaint "${data.title}" has been logged with ${priority} priority.`,
      complaintId
    );

    const complaint = this.getComplaintById(complaintId, userId, requestingRole);
    let message = 'Complaint submitted successfully';
    if (priority === 'critical') {
      message = 'Complaint submitted. Priority automatically escalated to CRITICAL due to urgent indicators.';
    }

    return { complaint: complaint!, message };
  }

  listComplaints(
    filter: ComplaintFilterDTO,
    requestingRole: Role,
    requestingUserId: number
  ): { complaints: Complaint[]; total: number; totalPages: number } {
    const whereClauses: string[] = [];
    const params: any[] = [];

    // Rule 5: RBAC Scoping
    if (requestingRole === 'student') {
      whereClauses.push('c.user_id = ?');
      params.push(requestingUserId);
    }

    if (filter.status) {
      whereClauses.push('c.status = ?');
      params.push(filter.status);
    }
    if (filter.category) {
      whereClauses.push('c.category = ?');
      params.push(filter.category);
    }
    if (filter.priority) {
      whereClauses.push('c.priority = ?');
      params.push(filter.priority);
    }
    if (filter.department_id && filter.department_id > 0) {
      whereClauses.push('c.department_id = ?');
      params.push(filter.department_id);
    }
    if (filter.sla_escalated !== undefined) {
      whereClauses.push('c.sla_escalated = ?');
      params.push(filter.sla_escalated ? 1 : 0);
    }
    if (filter.search && filter.search.trim()) {
      const trimmed = filter.search.trim();
      const term = `%${trimmed}%`;
      const numericId = parseInt(trimmed.replace(/^#|^GRV-/i, ''), 10);
      if (!isNaN(numericId) && numericId > 0) {
        whereClauses.push('(c.id = ? OR c.title LIKE ? OR c.description LIKE ? OR c.category LIKE ? OR u.name LIKE ? OR d.name LIKE ?)');
        params.push(numericId, term, term, term, term, term);
      } else {
        whereClauses.push('(c.title LIKE ? OR c.description LIKE ? OR c.category LIKE ? OR u.name LIKE ? OR d.name LIKE ?)');
        params.push(term, term, term, term, term);
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total count query
    const countRow = this.db
      .prepare(
        `SELECT COUNT(*) as count
         FROM complaints c
         LEFT JOIN users u ON c.user_id = u.id
         LEFT JOIN departments d ON c.department_id = d.id
         ${whereSql}`
      )
      .get(...params) as any;
    const total = Number(countRow.count);

    let page = Number(filter.page) || 1;
    let pageSize = Number(filter.page_size) || 20;
    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 20;
    if (pageSize > 100) pageSize = 100;

    const offset = (page - 1) * pageSize;
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;

    const sql = `
      SELECT c.*,
             u.id as user_id_val, u.name as user_name, u.email as user_email, u.role as user_role,
             d.id as dept_id, d.name as dept_name, d.code as dept_code, d.description as dept_desc
      FROM complaints c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN departments d ON c.department_id = d.id
      ${whereSql}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const rows = this.db.prepare(sql).all(...params, pageSize, offset) as any[];

    const complaints: Complaint[] = rows.map((r) => {
      const c: Complaint = {
        id: Number(r.id),
        title: r.title,
        description: r.description,
        category: r.category,
        priority: r.priority as Priority,
        status: r.status as Status,
        anonymous: Boolean(r.anonymous),
        sla_escalated: Boolean(r.sla_escalated),
        user_id: Number(r.user_id),
        department_id: Number(r.department_id),
        resolved_at: r.resolved_at || null,
        created_at: r.created_at,
        updated_at: r.updated_at,
        user: r.user_id_val
          ? {
              id: Number(r.user_id_val),
              name: r.user_name,
              email: r.user_email,
              role: r.user_role as Role,
            }
          : null,
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
      };

      // Rule 4: Mask anonymous user details for non-admin
      return maskComplaintForRole(c, requestingRole);
    });

    // Query attachments for all complaints on this page
    if (complaints.length > 0) {
      try {
        const ids = complaints.map((c) => c.id);
        const placeholders = ids.map(() => '?').join(',');
        const attachmentRows = this.db
          .prepare(
            `SELECT * FROM attachments WHERE complaint_id IN (${placeholders}) ORDER BY id ASC`
          )
          .all(...ids) as any[];

        const attMap = new Map<number, Attachment[]>();
        for (const att of attachmentRows) {
          const cid = Number(att.complaint_id);
          if (!attMap.has(cid)) attMap.set(cid, []);
          attMap.get(cid)!.push({
            id: Number(att.id),
            complaint_id: cid,
            file_name: att.file_name,
            file_size: Number(att.file_size),
            file_type: att.file_type,
            file_url: `/api/attachments/${att.id}`,
            created_at: att.created_at,
          });
        }

        for (const c of complaints) {
          c.attachments = attMap.get(c.id) || [];
        }
      } catch {
        // Ignore if attachments table not yet queried
      }
    }

    return { complaints, total, totalPages };
  }

  getComplaintById(
    id: number,
    requestingUserId: number,
    requestingRole: Role
  ): Complaint | null {
    const row = this.db
      .prepare(
        `SELECT c.*,
                u.id as user_id_val, u.name as user_name, u.email as user_email, u.role as user_role,
                d.id as dept_id, d.name as dept_name, d.code as dept_code, d.description as dept_desc
         FROM complaints c
         LEFT JOIN users u ON c.user_id = u.id
         LEFT JOIN departments d ON c.department_id = d.id
         WHERE c.id = ?`
      )
      .get(id) as any;

    if (!row) {
      return null;
    }

    // RBAC: student can only view their own complaint
    if (requestingRole === 'student' && Number(row.user_id) !== requestingUserId) {
      throw new Error('forbidden: cannot access this complaint');
    }

    // Fetch comments
    const commentRows = this.db
      .prepare(
        `SELECT cm.*, u.id as user_id_val, u.name as user_name, u.email as user_email, u.role as user_role
         FROM comments cm
         LEFT JOIN users u ON cm.user_id = u.id
         WHERE cm.complaint_id = ?
         ORDER BY cm.created_at ASC`
      )
      .all(id) as any[];

    const comments: Comment[] = commentRows.map((cm) => ({
      id: Number(cm.id),
      complaint_id: Number(cm.complaint_id),
      user_id: Number(cm.user_id),
      content: cm.content,
      created_at: cm.created_at,
      updated_at: cm.updated_at,
      user: cm.user_id_val
        ? {
            id: Number(cm.user_id_val),
            name: cm.user_name,
            email: cm.user_email,
            role: cm.user_role as Role,
          }
        : null,
    }));

    // Fetch attachments
    let attachments: Attachment[] = [];
    try {
      const attachmentRows = this.db
        .prepare(
          `SELECT * FROM attachments WHERE complaint_id = ? ORDER BY id ASC`
        )
        .all(id) as any[];

      attachments = attachmentRows.map((att) => ({
        id: Number(att.id),
        complaint_id: Number(att.complaint_id),
        file_name: att.file_name,
        file_size: Number(att.file_size),
        file_type: att.file_type,
        file_url: `/api/attachments/${att.id}`,
        created_at: att.created_at,
      }));
    } catch {
      // Table may not exist yet
    }

    const complaint: Complaint = {
      id: Number(row.id),
      title: row.title,
      description: row.description,
      category: row.category,
      priority: row.priority as Priority,
      status: row.status as Status,
      anonymous: Boolean(row.anonymous),
      sla_escalated: Boolean(row.sla_escalated),
      user_id: Number(row.user_id),
      department_id: Number(row.department_id),
      resolved_at: row.resolved_at || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      comments,
      attachments,
      user: row.user_id_val
        ? {
            id: Number(row.user_id_val),
            name: row.user_name,
            email: row.user_email,
            role: row.user_role as Role,
          }
        : null,
      department: row.dept_id
        ? {
            id: Number(row.dept_id),
            name: row.dept_name,
            code: row.dept_code,
            description: row.dept_desc,
            created_at: '',
            updated_at: '',
          }
        : null,
    };

    return maskComplaintForRole(complaint, requestingRole);
  }

  addAttachments(
    complaintId: number,
    requestingUserId: number,
    requestingRole: Role,
    files: Express.Multer.File[]
  ): Attachment[] {
    const complaint = this.getComplaintById(complaintId, requestingUserId, requestingRole);
    if (!complaint) {
      throw new Error('complaint not found');
    }

    if (requestingRole === 'student' && complaint.user_id !== requestingUserId && !complaint.anonymous) {
      throw new Error('forbidden: cannot add attachments to this complaint');
    }

    if (!files || files.length === 0) {
      return [];
    }

    const now = new Date().toISOString();
    const insertAtt = this.db.prepare(`
      INSERT INTO attachments (complaint_id, file_name, file_size, file_type, file_path, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const created: Attachment[] = [];
    for (const file of files) {
      const res = insertAtt.run(
        complaintId,
        file.originalname,
        file.size,
        file.mimetype,
        file.filename,
        now
      );
      created.push({
        id: Number(res.lastInsertRowid),
        complaint_id: complaintId,
        file_name: file.originalname,
        file_size: file.size,
        file_type: file.mimetype,
        file_url: `/api/attachments/${res.lastInsertRowid}`,
        created_at: now,
      });
    }

    return created;
  }

  getAttachmentById(id: number): (Attachment & { file_path: string }) | null {
    const row = this.db.prepare('SELECT * FROM attachments WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: Number(row.id),
      complaint_id: Number(row.complaint_id),
      file_name: row.file_name,
      file_size: Number(row.file_size),
      file_type: row.file_type,
      file_path: row.file_path,
      file_url: `/api/attachments/${row.id}`,
      created_at: row.created_at,
    };
  }

  deleteAttachment(id: number, requestingUserId: number, requestingRole: Role): boolean {
    const att = this.getAttachmentById(id);
    if (!att) {
      throw new Error('attachment not found');
    }

    const complaint = this.getComplaintById(att.complaint_id, requestingUserId, requestingRole);
    if (!complaint) {
      throw new Error('complaint not found');
    }

    if (requestingRole === 'student' && complaint.user_id !== requestingUserId) {
      throw new Error('forbidden: cannot delete attachments on this complaint');
    }

    this.db.prepare('DELETE FROM attachments WHERE id = ?').run(id);

    try {
      const filePath = path.resolve(UPLOAD_DIR, att.file_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // ignore unlink errors
    }

    return true;
  }

  updateStatus(id: number, newStatus: string, requestingRole: Role): Complaint {
    if (requestingRole !== 'admin' && requestingRole !== 'staff') {
      throw new Error('forbidden: only staff and admin can update status');
    }

    const validStatuses: Status[] = ['pending', 'in-progress', 'resolved', 'closed'];
    if (!validStatuses.includes(newStatus as Status)) {
      throw new Error(`invalid status value: ${newStatus}`);
    }

    const existingRow = this.db.prepare('SELECT * FROM complaints WHERE id = ?').get(id) as any;
    if (!existingRow) {
      throw new Error('complaint not found');
    }

    const currentStatus = existingRow.status as Status;
    const targetStatus = newStatus as Status;

    // Rule 2: Strict state machine transition validation
    if (!canTransition(currentStatus, targetStatus)) {
      throw new Error(`invalid transition: cannot transition from '${currentStatus}' to '${targetStatus}'`);
    }

    const now = new Date().toISOString();
    let resolvedAt: string | null = existingRow.resolved_at;
    if (targetStatus === 'resolved' || targetStatus === 'closed') {
      resolvedAt = now;
    } else if (targetStatus === 'pending' || targetStatus === 'in-progress') {
      resolvedAt = null;
    }

    this.db
      .prepare(
        `UPDATE complaints
         SET status = ?, resolved_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(targetStatus, resolvedAt, now, id);

    // Notify user of status change
    this.notificationService.create(
      Number(existingRow.user_id),
      'status',
      'Complaint status updated',
      `Your complaint "${existingRow.title}" is now ${targetStatus}.`,
      id
    );

    return this.getComplaintById(id, 0, requestingRole)!;
  }

  addComment(
    complaintId: number,
    userId: number,
    userRole: Role,
    content: string
  ): Comment {
    if (!content || !content.trim()) {
      throw new Error('comment content is required');
    }

    const complaintRow = this.db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaintId) as any;
    if (!complaintRow) {
      throw new Error('complaint not found');
    }

    if (userRole === 'student' && Number(complaintRow.user_id) !== userId) {
      throw new Error('forbidden: cannot comment on this complaint');
    }

    const now = new Date().toISOString();
    const result = this.db
      .prepare(
        `INSERT INTO comments (complaint_id, user_id, content, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(complaintId, userId, content.trim(), now, now);

    const commentId = Number(result.lastInsertRowid);

    // If staff/admin commented, notify the student
    if (userRole !== 'student' && Number(complaintRow.user_id) !== userId) {
      this.notificationService.create(
        Number(complaintRow.user_id),
        'comment',
        'New update on your complaint',
        `A staff member added a comment to your complaint: "${complaintRow.title}"`,
        complaintId
      );
    }

    const user = this.db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(userId) as any;

    return {
      id: commentId,
      complaint_id: complaintId,
      user_id: userId,
      content: content.trim(),
      created_at: now,
      updated_at: now,
      user: user
        ? {
            id: Number(user.id),
            name: user.name,
            email: user.email,
            role: user.role as Role,
          }
        : null,
    };
  }

  getComments(complaintId: number, userId: number, userRole: Role): Comment[] {
    const complaintRow = this.db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaintId) as any;
    if (!complaintRow) {
      throw new Error('complaint not found');
    }

    if (userRole === 'student' && Number(complaintRow.user_id) !== userId) {
      throw new Error('forbidden: cannot access comments for this complaint');
    }

    const rows = this.db
      .prepare(
        `SELECT cm.*, u.id as user_id_val, u.name as user_name, u.email as user_email, u.role as user_role
         FROM comments cm
         LEFT JOIN users u ON cm.user_id = u.id
         WHERE cm.complaint_id = ?
         ORDER BY cm.created_at ASC`
      )
      .all(complaintId) as any[];

    return rows.map((cm) => ({
      id: Number(cm.id),
      complaint_id: Number(cm.complaint_id),
      user_id: Number(cm.user_id),
      content: cm.content,
      created_at: cm.created_at,
      updated_at: cm.updated_at,
      user: cm.user_id_val
        ? {
            id: Number(cm.user_id_val),
            name: cm.user_name,
            email: cm.user_email,
            role: cm.user_role as Role,
          }
        : null,
    }));
  }

  processSLABreaches(): number {
    // 72 hours ago
    const threshold = new Date(Date.now() - SLA_DURATION_HOURS * 60 * 60 * 1000).toISOString();
    const rows = this.db
      .prepare(
        `SELECT id FROM complaints
         WHERE status = 'pending' AND created_at <= ? AND sla_escalated = 0`
      )
      .all(threshold) as any[];

    if (rows.length === 0) return 0;

    const ids = rows.map((r) => Number(r.id));
    const now = new Date().toISOString();

    for (const id of ids) {
      this.db
        .prepare('UPDATE complaints SET sla_escalated = 1, updated_at = ? WHERE id = ?')
        .run(now, id);
    }

    return ids.length;
  }

  exportCSV(filter: ComplaintFilterDTO): string {
    const { complaints } = this.listComplaints({ ...filter, page: 1, page_size: 10000 }, 'admin', 0);

    const headers = [
      'ID',
      'Title',
      'Category',
      'Priority',
      'Status',
      'SLA Escalated',
      'Department',
      'Anonymous',
      'Created At',
      'Resolved At',
    ];

    const lines: string[] = [headers.join(',')];

    for (const c of complaints) {
      const deptName = c.department ? c.department.name : '';
      const resolved = c.resolved_at || '';
      // Escape strings containing commas or quotes
      const escape = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;

      lines.push(
        [
          c.id,
          escape(c.title),
          escape(c.category),
          escape(c.priority),
          escape(c.status),
          String(c.sla_escalated),
          escape(deptName),
          String(c.anonymous),
          escape(c.created_at),
          escape(resolved),
        ].join(',')
      );
    }

    return lines.join('\n');
  }

  async exportPDF(filter: ComplaintFilterDTO): Promise<Buffer> {
    const { complaints } = this.listComplaints({ ...filter, page: 1, page_size: 10000 }, 'admin', 0);
    return generateComplaintsPdf(complaints, filter);
  }
}
