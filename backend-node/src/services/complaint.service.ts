import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

import {
  Complaint,
  Comment,
  Role,
  Status,
  Category,
  Priority,
  Attachment,
  Categories,
} from '../models/types';

import {
  calculatePriority,
  canTransition,
  maskComplaintForRole,
  SLA_DURATION_HOURS,
} from './complaint.rules';

import { NotificationService } from './notification.service';
import { UPLOAD_DIR } from '../middleware/upload';
import { generateComplaintsPdf } from '../utils/pdfReport';

export interface CreateComplaintDTO {
  title: string;
  description: string;
  category: Category;
  location?: string;
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

export interface UpdateComplaintDTO {
  title?: string;
  description?: string;
  category?: string;
  location?: string;
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
    if (
      !data.title ||
      !data.description ||
      !data.category ||
      !data.department_id
    ) {
      throw new Error(
        'title, description, category, and department_id are required'
      );
    }

    const deptId = Number(data.department_id);

    if (isNaN(deptId)) {
      throw new Error('invalid department_id');
    }

    const dept = this.db
      .prepare(
        'SELECT id FROM departments WHERE id = ?'
      )
      .get(deptId);

    if (!dept) {
      throw new Error('department not found');
    }

    const categoryRow = this.db
      .prepare(
        'SELECT category_id FROM categories WHERE category_name = ?'
      )
      .get(data.category) as
      | { category_id: number }
      | undefined;

    if (!categoryRow) {
      throw new Error('category not found');
    }

    const priority = calculatePriority(
      data.description,
      data.category
    );

    const now = new Date().toISOString();

    const isAnonymous =
      data.anonymous === true ||
      String(data.anonymous) === 'true';

    const location =
      data.location?.trim() || '';

    const result = this.db
      .prepare(
        `INSERT INTO complaints (
           title,
           description,
           category,
           category_id,
           priority,
           status,
           anonymous,
           sla_escalated,
           user_id,
           department_id,
           location,
           reference_number,
           resolved_at,
           created_at,
           updated_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.title,
        data.description,
        data.category,
        categoryRow.category_id,
        priority,
        'pending',
        isAnonymous ? 1 : 0,
        0,
        userId,
        deptId,
        location,
        null,
        null,
        now,
        now
      );

    const complaintId =
      Number(result.lastInsertRowid);

    const referenceNumber =
      `UC-${String(complaintId).padStart(6, '0')}`;

    this.db
      .prepare(
        'UPDATE complaints SET reference_number = ? WHERE id = ?'
      )
      .run(
        referenceNumber,
        complaintId
      );

    if (files && files.length > 0) {
      const insertAtt = this.db.prepare(`
        INSERT INTO attachments (
          complaint_id,
          file_name,
          file_size,
          file_type,
          file_path,
          created_at
        )
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

    this.notificationService.create(
      userId,
      'complaint_created',
      'Complaint Submitted',
      `Your complaint "${data.title}" has been logged with ${priority} priority.`,
      complaintId
    );

    const complaint =
      this.getComplaintById(
        complaintId,
        userId,
        requestingRole
      );

    let message =
      'Complaint submitted successfully';

    if (priority === 'critical') {
      message =
        'Complaint submitted. Priority automatically escalated to CRITICAL due to urgent indicators.';
    }

    return {
      complaint: complaint!,
      message,
    };
  }

  listComplaints(
    filter: ComplaintFilterDTO,
    requestingRole: Role,
    requestingUserId: number
  ): {
    complaints: Complaint[];
    total: number;
    totalPages: number;
  } {
    const whereClauses: string[] = [];
    const params: any[] = [];

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

    if (
      filter.department_id &&
      filter.department_id > 0
    ) {
      whereClauses.push(
        'c.department_id = ?'
      );
      params.push(
        filter.department_id
      );
    }

    if (
      filter.sla_escalated !== undefined
    ) {
      whereClauses.push(
        'c.sla_escalated = ?'
      );
      params.push(
        filter.sla_escalated ? 1 : 0
      );
    }

    if (
      filter.search &&
      filter.search.trim()
    ) {
      const trimmed =
        filter.search.trim();

      const term =
        `%${trimmed}%`;

      const numericId =
        parseInt(
          trimmed.replace(
            /^#|^GRV-/i,
            ''
          ),
          10
        );

      if (
        !isNaN(numericId) &&
        numericId > 0
      ) {
        whereClauses.push(
          `(
            c.id = ?
            OR c.reference_number LIKE ?
            OR c.title LIKE ?
            OR c.description LIKE ?
            OR c.category LIKE ?
            OR u.name LIKE ?
            OR d.name LIKE ?
          )`
        );

        params.push(
          numericId,
          term,
          term,
          term,
          term,
          term,
          term
        );
      } else {
        whereClauses.push(
          `(
            c.reference_number LIKE ?
            OR c.title LIKE ?
            OR c.description LIKE ?
            OR c.category LIKE ?
            OR u.name LIKE ?
            OR d.name LIKE ?
          )`
        );

        params.push(
          term,
          term,
          term,
          term,
          term,
          term
        );
      }
    }

    const whereSql =
      whereClauses.length > 0
        ? `WHERE ${whereClauses.join(
            ' AND '
          )}`
        : '';

    const countRow = this.db
      .prepare(
        `SELECT COUNT(*) as count
         FROM complaints c
         LEFT JOIN users u
           ON c.user_id = u.id
         LEFT JOIN departments d
           ON c.department_id = d.id
         ${whereSql}`
      )
      .get(...params) as any;

    const total =
      Number(countRow.count);

    let page =
      Number(filter.page) || 1;

    let pageSize =
      Number(filter.page_size) || 20;

    if (page < 1) {
      page = 1;
    }

    if (pageSize < 1) {
      pageSize = 20;
    }

    if (pageSize > 100) {
      pageSize = 100;
    }

    const offset =
      (page - 1) * pageSize;

    const totalPages =
      total > 0
        ? Math.ceil(
            total / pageSize
          )
        : 1;

    const sql = `
      SELECT c.*,
             u.id as user_id_val,
             u.name as user_name,
             u.email as user_email,
             u.role as user_role,
             d.id as dept_id,
             d.name as dept_name,
             d.code as dept_code,
             d.description as dept_desc
      FROM complaints c
      LEFT JOIN users u
        ON c.user_id = u.id
      LEFT JOIN departments d
        ON c.department_id = d.id
      ${whereSql}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const rows = this.db
      .prepare(sql)
      .all(
        ...params,
        pageSize,
        offset
      ) as any[];

    const complaints: Complaint[] =
      rows.map((r) => {
        const c: Complaint = {
          id: Number(r.id),
          reference_number:
            r.reference_number,
          title: r.title,
          description:
            r.description,
          category: r.category,
          category_id:
            r.category_id !== null &&
            r.category_id !== undefined
              ? Number(r.category_id)
              : null,
          priority:
            r.priority as Priority,
          status:
            r.status as Status,
          anonymous:
            Boolean(r.anonymous),
          sla_escalated:
            Boolean(r.sla_escalated),
          user_id:
            Number(r.user_id),
          department_id:
            Number(r.department_id),
          location:
            r.location || '',
          resolved_at:
            r.resolved_at || null,
          submitted_at:
            r.created_at,
          created_at:
            r.created_at,
          updated_at:
            r.updated_at,
          user: r.user_id_val
            ? {
                id: Number(
                  r.user_id_val
                ),
                name:
                  r.user_name,
                email:
                  r.user_email,
                role:
                  r.user_role as Role,
              }
            : null,
          department: r.dept_id
            ? {
                id: Number(
                  r.dept_id
                ),
                name:
                  r.dept_name,
                code:
                  r.dept_code,
                description:
                  r.dept_desc,
                created_at: '',
                updated_at: '',
              }
            : null,
        };

        return maskComplaintForRole(
          c,
          requestingRole
        );
      });

    if (complaints.length > 0) {
      try {
        const ids =
          complaints.map(
            (c) => c.id
          );

        const placeholders =
          ids
            .map(() => '?')
            .join(',');

        const attachmentRows =
          this.db
            .prepare(
              `SELECT *
               FROM attachments
               WHERE complaint_id IN (${placeholders})
               ORDER BY id ASC`
            )
            .all(...ids) as any[];

        const attMap =
          new Map<
            number,
            Attachment[]
          >();

        for (
          const att of attachmentRows
        ) {
          const cid =
            Number(
              att.complaint_id
            );

          if (!attMap.has(cid)) {
            attMap.set(cid, []);
          }

          attMap
            .get(cid)!
            .push({
              id: Number(att.id),
              complaint_id: cid,
              file_name:
                att.file_name,
              file_size:
                Number(
                  att.file_size
                ),
              file_type:
                att.file_type,
              file_url:
                `/api/attachments/${att.id}`,
              uploaded_at:
                att.uploaded_at ||
                att.created_at,
              created_at:
                att.created_at,
            });
        }

        for (const c of complaints) {
          c.attachments =
            attMap.get(c.id) || [];
        }
      } catch {
        // Ignore attachment query errors.
      }
    }

    return {
      complaints,
      total,
      totalPages,
    };
  }

  getComplaintById(
    id: number,
    requestingUserId: number,
    requestingRole: Role
  ): Complaint | null {
    const row = this.db
      .prepare(
        `SELECT c.*,
                u.id as user_id_val,
                u.name as user_name,
                u.email as user_email,
                u.role as user_role,
                d.id as dept_id,
                d.name as dept_name,
                d.code as dept_code,
                d.description as dept_desc
         FROM complaints c
         LEFT JOIN users u
           ON c.user_id = u.id
         LEFT JOIN departments d
           ON c.department_id = d.id
         WHERE c.id = ?`
      )
      .get(id) as any;

    if (!row) {
      return null;
    }

    if (
      requestingRole === 'student' &&
      Number(row.user_id) !==
        requestingUserId
    ) {
      throw new Error(
        'forbidden: cannot access this complaint'
      );
    }

    const commentRows =
      this.db
        .prepare(
          `SELECT cu.*,
                  u.id as user_id_val,
                  u.name as user_name,
                  u.email as user_email,
                  u.role as user_role
           FROM complaint_updates cu
           LEFT JOIN users u
             ON cu.updated_by = u.id
           WHERE cu.complaint_id = ?
             AND cu.comment IS NOT NULL
             AND TRIM(cu.comment) <> ''
           ORDER BY cu.updated_at ASC`
        )
        .all(id) as any[];

    const comments: Comment[] =
      commentRows.map(
        (cu) => ({
          id: Number(
            cu.update_id
          ),
          complaint_id:
            Number(
              cu.complaint_id
            ),
          user_id:
            Number(
              cu.updated_by
            ),
          content:
            cu.comment,
          created_at:
            cu.updated_at,
          updated_at:
            cu.updated_at,
          user:
            cu.user_id_val
              ? {
                  id: Number(
                    cu.user_id_val
                  ),
                  name:
                    cu.user_name,
                  email:
                    cu.user_email,
                  role:
                    cu.user_role as Role,
                }
              : null,
        })
      );

    let attachments: Attachment[] =
      [];

    try {
      const attachmentRows =
        this.db
          .prepare(
            `SELECT *
             FROM attachments
             WHERE complaint_id = ?
             ORDER BY id ASC`
          )
          .all(id) as any[];

      attachments =
        attachmentRows.map(
          (att) => ({
            id: Number(
              att.id
            ),
            complaint_id:
              Number(
                att.complaint_id
              ),
            file_name:
              att.file_name,
            file_size:
              Number(
                att.file_size
              ),
            file_type:
              att.file_type,
            file_url:
              `/api/attachments/${att.id}`,
            uploaded_at:
              att.uploaded_at ||
              att.created_at,
            created_at:
              att.created_at,
          })
        );
    } catch {
      // Table may not exist yet.
    }

    const complaint: Complaint = {
      id: Number(row.id),
      reference_number:
        row.reference_number,
      title:
        row.title,
      description:
        row.description,
      category:
        row.category,
      category_id:
        row.category_id !== null &&
        row.category_id !== undefined
          ? Number(
              row.category_id
            )
          : null,
      priority:
        row.priority as Priority,
      status:
        row.status as Status,
      anonymous:
        Boolean(
          row.anonymous
        ),
      sla_escalated:
        Boolean(
          row.sla_escalated
        ),
      user_id:
        Number(row.user_id),
      department_id:
        Number(
          row.department_id
        ),
      location:
        row.location || '',
      resolved_at:
        row.resolved_at ||
        null,
      submitted_at:
        row.created_at,
      created_at:
        row.created_at,
      updated_at:
        row.updated_at,
      comments,
      attachments,
      user:
        row.user_id_val
          ? {
              id: Number(
                row.user_id_val
              ),
              name:
                row.user_name,
              email:
                row.user_email,
              role:
                row.user_role as Role,
            }
          : null,
      department:
        row.dept_id
          ? {
              id: Number(
                row.dept_id
              ),
              name:
                row.dept_name,
              code:
                row.dept_code,
              description:
                row.dept_desc,
              created_at: '',
              updated_at: '',
            }
          : null,
    };

    return maskComplaintForRole(
      complaint,
      requestingRole
    );
  }

  addAttachments(
    complaintId: number,
    requestingUserId: number,
    requestingRole: Role,
    files: Express.Multer.File[]
  ): Attachment[] {
    const complaint =
      this.getComplaintById(
        complaintId,
        requestingUserId,
        requestingRole
      );

    if (!complaint) {
      throw new Error(
        'complaint not found'
      );
    }

    if (
      requestingRole === 'student' &&
      complaint.user_id !==
        requestingUserId &&
      !complaint.anonymous
    ) {
      throw new Error(
        'forbidden: cannot add attachments to this complaint'
      );
    }

    if (
      !files ||
      files.length === 0
    ) {
      return [];
    }

    const now =
      new Date().toISOString();

    const insertAtt =
      this.db.prepare(`
        INSERT INTO attachments (
          complaint_id,
          file_name,
          file_size,
          file_type,
          file_path,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `);

    const created: Attachment[] =
      [];

    for (const file of files) {
      const res =
        insertAtt.run(
          complaintId,
          file.originalname,
          file.size,
          file.mimetype,
          file.filename,
          now
        );

      created.push({
        id: Number(
          res.lastInsertRowid
        ),
        complaint_id:
          complaintId,
        file_name:
          file.originalname,
        file_size:
          file.size,
        file_type:
          file.mimetype,
        file_url:
          `/api/attachments/${res.lastInsertRowid}`,
        uploaded_at:
          now,
        created_at:
          now,
      });
    }

    return created;
  }

  getAttachmentById(
    id: number
  ): (Attachment & {
    file_path: string;
  }) | null {
    const row = this.db
      .prepare(
        'SELECT * FROM attachments WHERE id = ?'
      )
      .get(id) as any;

    if (!row) {
      return null;
    }

    return {
      id: Number(row.id),
      complaint_id:
        Number(
          row.complaint_id
        ),
      file_name:
        row.file_name,
      file_size:
        Number(
          row.file_size
        ),
      file_type:
        row.file_type,
      file_path:
        row.file_path,
      file_url:
        `/api/attachments/${row.id}`,
      uploaded_at:
        row.uploaded_at ||
        row.created_at,
      created_at:
        row.created_at,
    };
  }

  deleteAttachment(
    id: number,
    requestingUserId: number,
    requestingRole: Role
  ): boolean {
    const att =
      this.getAttachmentById(id);

    if (!att) {
      throw new Error(
        'attachment not found'
      );
    }

    const complaint =
      this.getComplaintById(
        att.complaint_id,
        requestingUserId,
        requestingRole
      );

    if (!complaint) {
      throw new Error(
        'complaint not found'
      );
    }

    if (
      requestingRole === 'student' &&
      complaint.user_id !==
        requestingUserId
    ) {
      throw new Error(
        'forbidden: cannot delete attachments on this complaint'
      );
    }

    this.db
      .prepare(
        'DELETE FROM attachments WHERE id = ?'
      )
      .run(id);

    try {
      const filePath =
        path.resolve(
          UPLOAD_DIR,
          att.file_path
        );

      if (
        fs.existsSync(filePath)
      ) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Ignore unlink errors.
    }

    return true;
  }

  assignComplaint(
    complaintId: number,
    departmentId: number,
    requestingUserId: number,
    requestingRole: Role
  ): Complaint {
    if (
      requestingRole !== 'admin' &&
      requestingRole !== 'staff'
    ) {
      throw new Error(
        'forbidden: only staff and admin can assign complaints'
      );
    }

    const parsedDepartmentId =
      Number(departmentId);

    if (
      !Number.isInteger(
        parsedDepartmentId
      ) ||
      parsedDepartmentId <= 0
    ) {
      throw new Error(
        'invalid department_id'
      );
    }

    const complaintRow =
      this.db
        .prepare(
          'SELECT * FROM complaints WHERE id = ?'
        )
        .get(complaintId) as any;

    if (!complaintRow) {
      throw new Error(
        'complaint not found'
      );
    }

    const departmentRow =
      this.db
        .prepare(
          `SELECT id, name, code, description
           FROM departments
           WHERE id = ?`
        )
        .get(
          parsedDepartmentId
        ) as any;

    if (!departmentRow) {
      throw new Error(
        'department not found'
      );
    }

    const now =
      new Date().toISOString();

    this.db
      .prepare(
        `UPDATE complaints
         SET department_id = ?,
             updated_at = ?
         WHERE id = ?`
      )
      .run(
        parsedDepartmentId,
        now,
        complaintId
      );

    this.db
      .prepare(
        `INSERT INTO audit_log (
           user_id,
           action,
           table_affected,
           record_id,
           timestamp
         )
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        requestingUserId,
        'assign_department',
        'complaints',
        complaintId,
        now
      );

    this.notificationService.create(
      Number(
        complaintRow.user_id
      ),
      'assignment',
      'Complaint department updated',
      `Your complaint "${complaintRow.title}" has been assigned to ${departmentRow.name}.`,
      complaintId
    );

    return this.getComplaintById(
      complaintId,
      0,
      requestingRole
    )!;
  }

  /**
   * FR07:
   * Authorized staff/admin may edit complaint
   * details without changing ownership,
   * assignment, status, SLA fields, or attachments.
   */
  updateComplaint(
    id: number,
    updates: UpdateComplaintDTO,
    requestingUserId: number,
    requestingRole: Role
  ): Complaint {
    if (
      requestingRole !== 'admin' &&
      requestingRole !== 'staff'
    ) {
      throw new Error(
        'forbidden: only staff and admin can edit complaints'
      );
    }

    const existingRow =
      this.db
        .prepare(
          'SELECT * FROM complaints WHERE id = ?'
        )
        .get(id) as any;

    if (!existingRow) {
      throw new Error(
        'complaint not found'
      );
    }

    const title =
      updates.title !== undefined
        ? String(
            updates.title
          ).trim()
        : existingRow.title;

    const description =
      updates.description !==
      undefined
        ? String(
            updates.description
          ).trim()
        : existingRow.description;

    const category =
      updates.category !==
      undefined
        ? String(
            updates.category
          ).trim()
        : existingRow.category;

    const location =
      updates.location !==
      undefined
        ? String(
            updates.location
          ).trim()
        : existingRow.location ||
          '';

    if (!title) {
      throw new Error(
        'title is required'
      );
    }

    if (!description) {
      throw new Error(
        'description is required'
      );
    }

    if (!category) {
      throw new Error(
        'category is required'
      );
    }

    /*
     * Validate against the application's
     * supported categories without using
     * a type assertion with includes().
     */
    const validCategory =
      Categories.find(
        (item) => item === category
      );

    if (!validCategory) {
      throw new Error(
        `invalid category value: ${category}`
      );
    }

    const categoryRow =
      this.db
        .prepare(
          `SELECT category_id
           FROM categories
           WHERE category_name = ?
             AND is_active = 1`
        )
        .get(
          validCategory
        ) as
        | {
            category_id: number;
          }
        | undefined;

    if (!categoryRow) {
      throw new Error(
        'category not found or inactive'
      );
    }

    /*
     * Recalculate priority because the
     * description/category may have changed.
     */
    const priority =
      calculatePriority(
        description,
        validCategory
      );

    const now =
      new Date().toISOString();

    this.db
      .prepare(
        `UPDATE complaints
         SET title = ?,
             description = ?,
             category = ?,
             category_id = ?,
             location = ?,
             priority = ?,
             updated_at = ?
         WHERE id = ?`
      )
      .run(
        title,
        description,
        validCategory,
        Number(
          categoryRow.category_id
        ),
        location || null,
        priority,
        now,
        id
      );

    /*
     * SDD audit_log:
     * Record the complaint modification.
     */
    this.db
      .prepare(
        `INSERT INTO audit_log (
           user_id,
           action,
           table_affected,
           record_id,
           timestamp
         )
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        requestingUserId,
        'update',
        'complaints',
        id,
        now
      );

    /*
     * Notify the complainant that the
     * complaint details were updated.
     */
    if (
      Number(
        existingRow.user_id
      ) !== requestingUserId
    ) {
      this.notificationService.create(
        Number(
          existingRow.user_id
        ),
        'complaint',
        'Complaint updated',
        `Your complaint "${title}" has been updated by staff.`,
        id
      );
    }

    return this.getComplaintById(
      id,
      0,
      requestingRole
    )!;
  }

  updateStatus(
    id: number,
    newStatus: string,
    requestingRole: Role
  ): Complaint {
    if (
      requestingRole !== 'admin' &&
      requestingRole !== 'staff'
    ) {
      throw new Error(
        'forbidden: only staff and admin can update status'
      );
    }

    const validStatuses: Status[] =
      [
        'pending',
        'in-progress',
        'resolved',
        'closed',
      ];

    if (
      !validStatuses.includes(
        newStatus as Status
      )
    ) {
      throw new Error(
        `invalid status value: ${newStatus}`
      );
    }

    const existingRow =
      this.db
        .prepare(
          'SELECT * FROM complaints WHERE id = ?'
        )
        .get(id) as any;

    if (!existingRow) {
      throw new Error(
        'complaint not found'
      );
    }

    const currentStatus =
      existingRow.status as Status;

    const targetStatus =
      newStatus as Status;

    if (
      !canTransition(
        currentStatus,
        targetStatus
      )
    ) {
      throw new Error(
        `invalid transition: cannot transition from '${currentStatus}' to '${targetStatus}'`
      );
    }

    const now =
      new Date().toISOString();

    let resolvedAt:
      | string
      | null =
      existingRow.resolved_at;

    if (
      targetStatus === 'resolved' ||
      targetStatus === 'closed'
    ) {
      resolvedAt = now;
    } else if (
      targetStatus === 'pending' ||
      targetStatus === 'in-progress'
    ) {
      resolvedAt = null;
    }

    this.db
      .prepare(
        `UPDATE complaints
         SET status = ?,
             resolved_at = ?,
             updated_at = ?
         WHERE id = ?`
      )
      .run(
        targetStatus,
        resolvedAt,
        now,
        id
      );

    this.notificationService.create(
      Number(
        existingRow.user_id
      ),
      'status',
      'Complaint status updated',
      `Your complaint "${existingRow.title}" is now ${targetStatus}.`,
      id
    );

    return this.getComplaintById(
      id,
      0,
      requestingRole
    )!;
  }

  addComment(
    complaintId: number,
    userId: number,
    userRole: Role,
    content: string
  ): Comment {
    if (
      !content ||
      !content.trim()
    ) {
      throw new Error(
        'comment content is required'
      );
    }

    const complaintRow =
      this.db
        .prepare(
          'SELECT * FROM complaints WHERE id = ?'
        )
        .get(complaintId) as any;

    if (!complaintRow) {
      throw new Error(
        'complaint not found'
      );
    }

    if (
      userRole === 'student' &&
      Number(
        complaintRow.user_id
      ) !== userId
    ) {
      throw new Error(
        'forbidden: cannot comment on this complaint'
      );
    }

    const now =
      new Date().toISOString();

    const result =
      this.db
        .prepare(
          `INSERT INTO complaint_updates (
             complaint_id,
             updated_by,
             status,
             comment,
             updated_at
           )
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(
          complaintId,
          userId,
          null,
          content.trim(),
          now
        );

    const updateId =
      Number(
        result.lastInsertRowid
      );

    if (
      userRole !== 'student' &&
      Number(
        complaintRow.user_id
      ) !== userId
    ) {
      this.notificationService.create(
        Number(
          complaintRow.user_id
        ),
        'comment',
        'New update on your complaint',
        `A staff member added a comment to your complaint: "${complaintRow.title}"`,
        complaintId
      );
    }

    const user =
      this.db
        .prepare(
          'SELECT id, name, email, role FROM users WHERE id = ?'
        )
        .get(userId) as any;

    return {
      id: updateId,
      complaint_id:
        complaintId,
      user_id:
        userId,
      content:
        content.trim(),
      created_at:
        now,
      updated_at:
        now,
      user: user
        ? {
            id: Number(
              user.id
            ),
            name:
              user.name,
            email:
              user.email,
            role:
              user.role as Role,
          }
        : null,
    };
  }

  getComments(
    complaintId: number,
    userId: number,
    userRole: Role
  ): Comment[] {
    const complaintRow =
      this.db
        .prepare(
          'SELECT * FROM complaints WHERE id = ?'
        )
        .get(complaintId) as any;

    if (!complaintRow) {
      throw new Error(
        'complaint not found'
      );
    }

    if (
      userRole === 'student' &&
      Number(
        complaintRow.user_id
      ) !== userId
    ) {
      throw new Error(
        'forbidden: cannot access comments for this complaint'
      );
    }

    const rows =
      this.db
        .prepare(
          `SELECT cu.*,
                  u.id as user_id_val,
                  u.name as user_name,
                  u.email as user_email,
                  u.role as user_role
           FROM complaint_updates cu
           LEFT JOIN users u
             ON cu.updated_by = u.id
           WHERE cu.complaint_id = ?
             AND cu.comment IS NOT NULL
             AND TRIM(cu.comment) <> ''
           ORDER BY cu.updated_at ASC`
        )
        .all(
          complaintId
        ) as any[];

    return rows.map(
      (cu) => ({
        id: Number(
          cu.update_id
        ),
        complaint_id:
          Number(
            cu.complaint_id
          ),
        user_id:
          Number(
            cu.updated_by
          ),
        content:
          cu.comment,
        created_at:
          cu.updated_at,
        updated_at:
          cu.updated_at,
        user:
          cu.user_id_val
            ? {
                id: Number(
                  cu.user_id_val
                ),
                name:
                  cu.user_name,
                email:
                  cu.user_email,
                role:
                  cu.user_role as Role,
              }
            : null,
      })
    );
  }

  processSLABreaches(): number {
    const threshold =
      new Date(
        Date.now() -
          SLA_DURATION_HOURS *
            60 *
            60 *
            1000
      ).toISOString();

    const rows =
      this.db
        .prepare(
          `SELECT id
           FROM complaints
           WHERE status = 'pending'
             AND created_at <= ?
             AND sla_escalated = 0`
        )
        .all(
          threshold
        ) as any[];

    if (rows.length === 0) {
      return 0;
    }

    const ids =
      rows.map(
        (r) => Number(r.id)
      );

    const now =
      new Date().toISOString();

    for (const id of ids) {
      this.db
        .prepare(
          `UPDATE complaints
           SET sla_escalated = 1,
               updated_at = ?
           WHERE id = ?`
        )
        .run(
          now,
          id
        );
    }

    return ids.length;
  }

  exportCSV(
    filter: ComplaintFilterDTO
  ): string {
    const { complaints } =
      this.listComplaints(
        {
          ...filter,
          page: 1,
          page_size: 10000,
        },
        'admin',
        0
      );

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

    const lines: string[] = [
      headers.join(',')
    ];

    for (
      const c of complaints
    ) {
      const deptName =
        c.department
          ? c.department.name
          : '';

      const resolved =
        c.resolved_at || '';

      const escape = (
        str: string
      ) =>
        `"${(str || '').replace(
          /"/g,
          '""'
        )}"`;

      lines.push(
        [
          c.id,
          escape(c.title),
          escape(c.category),
          escape(c.priority),
          escape(c.status),
          String(
            c.sla_escalated
          ),
          escape(deptName),
          String(
            c.anonymous
          ),
          escape(
            c.created_at
          ),
          escape(
            resolved
          ),
        ].join(',')
      );
    }

    return lines.join('\n');
  }

  async exportPDF(
    filter: ComplaintFilterDTO
  ): Promise<Buffer> {
    const { complaints } =
      this.listComplaints(
        {
          ...filter,
          page: 1,
          page_size: 10000,
        },
        'admin',
        0
      );

    return generateComplaintsPdf(
      complaints,
      filter
    );
  }

  addFeedback(
    complaintId: number,
    userId: number,
    rating: number,
    comment?: string
  ): any {
    const complaint =
      this.db
        .prepare(
          `SELECT id, user_id, status
           FROM complaints
           WHERE id = ?`
        )
        .get(
          complaintId
        ) as any;

    if (!complaint) {
      throw new Error(
        'complaint not found'
      );
    }

    if (
      Number(
        complaint.user_id
      ) !== Number(userId)
    ) {
      throw new Error(
        'forbidden: only the complaint owner can submit feedback'
      );
    }

    if (
      complaint.status !==
        'resolved' &&
      complaint.status !==
        'closed'
    ) {
      throw new Error(
        'feedback can only be submitted after the complaint is resolved'
      );
    }

    const parsedRating =
      Number(rating);

    if (
      !Number.isInteger(
        parsedRating
      ) ||
      parsedRating < 1 ||
      parsedRating > 5
    ) {
      throw new Error(
        'rating must be an integer between 1 and 5'
      );
    }

    const existing =
      this.db
        .prepare(
          `SELECT feedback_id
           FROM feedback
           WHERE complaint_id = ?
             AND user_id = ?`
        )
        .get(
          complaintId,
          userId
        ) as any;

    if (existing) {
      throw new Error(
        'feedback has already been submitted for this complaint'
      );
    }

    const feedbackComment =
      comment !== undefined &&
      comment !== null &&
      String(comment).trim() !== ''
        ? String(
            comment
          ).trim()
        : null;

    const submittedAt =
      new Date().toISOString();

    const result =
      this.db
        .prepare(
          `INSERT INTO feedback (
             complaint_id,
             user_id,
             rating,
             comment,
             submitted_at
           )
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(
          complaintId,
          userId,
          parsedRating,
          feedbackComment,
          submittedAt
        );

    const feedback =
      this.db
        .prepare(
          `SELECT
             f.feedback_id,
             f.complaint_id,
             f.user_id,
             f.rating,
             f.comment,
             f.submitted_at,
             u.id AS user_id_value,
             u.name AS user_name,
             u.email AS user_email,
             u.role AS user_role
           FROM feedback f
           LEFT JOIN users u
             ON u.id = f.user_id
           WHERE f.feedback_id = ?`
        )
        .get(
          Number(
            result.lastInsertRowid
          )
        ) as any;

    return {
      feedback_id:
        feedback.feedback_id,
      complaint_id:
        feedback.complaint_id,
      user_id:
        feedback.user_id,
      rating:
        feedback.rating,
      comment:
        feedback.comment,
      submitted_at:
        feedback.submitted_at,
      user:
        feedback.user_id_value
          ? {
              id:
                feedback.user_id_value,
              name:
                feedback.user_name,
              email:
                feedback.user_email,
              role:
                feedback.user_role,
            }
          : null,
    };
  }

  getFeedback(
    complaintId: number,
    requestingUserId: number,
    requestingRole: Role
  ): any {
    const complaint =
      this.db
        .prepare(
          `SELECT id, user_id
           FROM complaints
           WHERE id = ?`
        )
        .get(
          complaintId
        ) as any;

    if (!complaint) {
      throw new Error(
        'complaint not found'
      );
    }

    if (
      requestingRole === 'student' &&
      Number(
        complaint.user_id
      ) !==
        Number(
          requestingUserId
        )
    ) {
      throw new Error(
        'forbidden: you cannot view feedback for this complaint'
      );
    }

    const feedback =
      this.db
        .prepare(
          `SELECT
             f.feedback_id,
             f.complaint_id,
             f.user_id,
             f.rating,
             f.comment,
             f.submitted_at,
             u.id AS user_id_value,
             u.name AS user_name,
             u.email AS user_email,
             u.role AS user_role
           FROM feedback f
           LEFT JOIN users u
             ON u.id = f.user_id
           WHERE f.complaint_id = ?
           ORDER BY f.submitted_at DESC`
        )
        .all(
          complaintId
        ) as any[];

    return feedback.map(
      (row) => ({
        feedback_id:
          row.feedback_id,
        complaint_id:
          row.complaint_id,
        user_id:
          row.user_id,
        rating:
          row.rating,
        comment:
          row.comment,
        submitted_at:
          row.submitted_at,
        user:
          row.user_id_value
            ? {
                id:
                  row.user_id_value,
                name:
                  row.user_name,
                email:
                  row.user_email,
                role:
                  row.user_role,
              }
            : null,
      })
    );
  }

  deleteComplaint(
    complaintId: number,
    requestingUserId: number,
    requestingRole: Role
  ): void {
    if (
      requestingRole !== 'admin'
    ) {
      throw new Error(
        'forbidden: only admin can delete complaints'
      );
    }

    const complaint =
      this.db
        .prepare(
          `SELECT id
           FROM complaints
           WHERE id = ?`
        )
        .get(
          complaintId
        ) as any;

    if (!complaint) {
      throw new Error(
        'complaint not found'
      );
    }

    const now =
      new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO audit_log (
           user_id,
           action,
           table_affected,
           record_id,
           timestamp
         )
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        requestingUserId,
        'delete',
        'complaints',
        complaintId,
        now
      );

    this.db
      .prepare(
        `DELETE FROM complaints
         WHERE id = ?`
      )
      .run(
        complaintId
      );
  }
}