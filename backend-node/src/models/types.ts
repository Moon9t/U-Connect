export type Role = 'admin' | 'staff' | 'student';

export const Roles = {
  Admin: 'admin' as const,
  Staff: 'staff' as const,
  Student: 'student' as const,
};

export const Categories = [
  'IT',
  'Facilities',
  'Academic',
  'Exam Hall',
  'Safety',
  'Finance',
  'Student Affairs',
] as const;

export type Category = (typeof Categories)[number];

export const Priorities = ['low', 'medium', 'high', 'critical'] as const;
export type Priority = (typeof Priorities)[number];

export const Statuses = [
  'pending',
  'in-progress',
  'resolved',
  'closed',
] as const;

export type Status = (typeof Statuses)[number];

/**
 * SDD: roles
 *
 * The API continues to expose `id`, `name`, and `code` for compatibility
 * with the approved frontend UI.
 */
export interface Department {
  id: number;
  name: string;
  code: string;
  description: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * SDD: users
 *
 * `role_id` represents the normalized SDD relationship to roles.
 * `role` is retained because the current frontend consumes the role name
 * directly.
 */
export interface User {
  id: number;
  name: string;
  username?: string;
  email: string;
  password_hash?: string;

  role: Role;
  role_id?: number;

  department_id: number | null;
  department?: Department | null;

  is_active?: boolean;

  created_at: string;
  updated_at: string;
}

/**
 * SDD: complaint_updates
 *
 * This is the normalized representation of progress/status history.
 */
export interface ComplaintUpdate {
  update_id: number;
  complaint_id: number;
  updated_by: number;
  status: Status | null;
  comment: string | null;
  updated_at: string;

  user?: {
    id: number;
    name: string;
    email: string;
    role: Role;
  } | null;
}

/**
 * Legacy compatibility type.
 *
 * The approved UI currently uses comments. Keep this interface while the
 * backend migrates comment operations to complaint_updates.
 */
export interface Comment {
  id: number;
  complaint_id: number;
  user_id: number;
  content: string;
  created_at: string;
  updated_at: string;

  user?: {
    id: number;
    name: string;
    email: string;
    role: Role;
  } | null;
}

/**
 * SDD: attachments
 *
 * `uploaded_at` is the SDD field.
 * `file_url` and `created_at` are retained for current UI compatibility.
 */
export interface Attachment {
  id: number;
  attachment_id?: number;

  complaint_id: number;

  file_name: string;
  file_size: number;
  file_type: string;
  file_path?: string;

  file_url: string;

  uploaded_at?: string;
  created_at: string;
}

/**
 * SDD: feedback
 */
export interface Feedback {
  feedback_id: number;
  complaint_id: number;
  user_id: number;

  rating: number;
  comment: string | null;

  submitted_at: string;

  user?: {
    id: number;
    name: string;
    email: string;
    role: Role;
  } | null;
}

/**
 * SDD: audit_log
 */
export interface AuditLog {
  log_id: number;
  user_id: number | null;

  action: string;
  table_affected: string;
  record_id: number | null;

  timestamp: string;

  user?: {
    id: number;
    name: string;
    email: string;
    role: Role;
  } | null;
}

/**
 * SDD: complaints
 *
 * Normalized SDD fields:
 *   complaint_id
 *   reference_number
 *   user_id
 *   category_id
 *   department_id
 *   title
 *   description
 *   location
 *   priority
 *   status
 *   submitted_at
 *
 * Compatibility fields are retained for the approved frontend:
 *   id
 *   category
 *   anonymous
 *   sla_escalated
 *   resolved_at
 *   created_at
 *   updated_at
 */
export interface Complaint {
  /**
   * Current frontend/API identifier.
   * Corresponds to SDD `complaint_id`.
   */
  id: number;

  /**
   * SDD complaint reference number.
   */
  reference_number: string;

  title: string;
  description: string;

  /**
   * Current frontend/API category name.
   */
  category: Category | string;

  /**
   * SDD normalized category relationship.
   */
  category_id?: number | null;

  /**
   * SDD department relationship.
   */
  department_id: number;

  /**
   * User who submitted the complaint.
   * For anonymous complaints this may be masked in API responses.
   */
  user_id: number;

  /**
   * SDD location field.
   */
  location: string;

  priority: Priority;
  status: Status;

  /**
   * Retained because the approved UI and existing SLA implementation use it.
   */
  anonymous: boolean;

  /**
   * Retained for the existing 72-hour SLA functionality.
   */
  sla_escalated: boolean;

  /**
   * Existing compatibility field used by the dashboard/UI.
   */
  resolved_at: string | null;

  /**
   * SDD `submitted_at` maps to the existing API/database timestamp.
   */
  submitted_at?: string;

  /**
   * Existing API/database compatibility timestamps.
   */
  created_at: string;
  updated_at: string;

  user?: Partial<User> | null;
  department?: Department | null;

  /**
   * Existing UI compatibility.
   */
  comments?: Comment[];

  /**
   * SDD normalized progress history.
   */
  updates?: ComplaintUpdate[];

  attachments?: Attachment[];

  /**
   * Feedback submitted after resolution.
   */
  feedback?: Feedback | null;
}

/**
 * SDD: notifications are not part of the normalized database section,
 * but the approved UI/backend currently uses them, so retain the model.
 */
export interface Notification {
  id: number;
  user_id: number;

  type: string;
  title: string;
  description: string;

  related_complaint_id: number | null;

  read_at: string | null;

  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_complaints: number;

  pending_complaints: number;
  in_progress_complaints: number;
  resolved_complaints: number;
  closed_complaints: number;

  /**
   * Existing 72-hour SLA metric.
   */
  sla_breaches: number;

  average_resolution_hours: number;

  /**
   * SDD reporting requirements:
   * FR21 - grouped by category
   * FR22 - grouped by status
   */
  by_category: Record<string, number>;
  by_status: Record<string, number>;
}