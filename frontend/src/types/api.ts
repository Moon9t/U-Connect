export type UserRole = 'admin' | 'staff' | 'student';

export interface Department {
  id: number;
  name: string;
  description?: string | null;
  created_at?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  is_active?: boolean | number;
  created_at?: string;
}

export type ComplaintCategory =
  | 'IT'
  | 'Facilities'
  | 'Academic'
  | 'Exam Hall'
  | 'Safety'
  | 'Finance'
  | 'Student Affairs';

export type ComplaintPriority = 'low' | 'medium' | 'high' | 'critical';

export type ComplaintStatus =
  | 'pending'
  | 'in-progress'
  | 'resolved'
  | 'closed';

export interface Comment {
  id: number;
  complaint_id: number;
  user_id: number;
  user?: User | null;
  status?: ComplaintStatus;
  role: UserRole;
  content: string;
  created_at: string;
}

export interface Attachment {
  attachment_id: number;
  complaint_id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  uploaded_at: string;
}

export interface Feedback {
  feedback_id: number;
  complaint_id: number;
  user_id: number;
  rating: number;
  comment?: string | null;
  submitted_at: string;
}

export interface ComplaintUpdate {
  update_id: number;
  complaint_id: number;
  user_id: number;
  status: ComplaintStatus;
  comment?: string | null;
  updated_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  description: string;
  related_complaint_id?: number;
  read_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Complaint {
  id: number;
  reference_number: string;
  title: string;
  description: string;
  category: ComplaintCategory | string;
  category_id?: number | null;
  location: string;
  priority: ComplaintPriority | string;
  status: ComplaintStatus;
  user_id: number;
  user?: User | null;
  department_id?: number | null;
  department?: Department | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  comments?: Comment[];
  attachments?: Attachment[];
  feedback?: Feedback[];
}

export interface DashboardStats {
  total_complaints: number;
  pending_complaints: number;
  in_progress_complaints: number;
  resolved_complaints: number;
  closed_complaints: number;
  sla_breaches: number;
  average_resolution_hours: number;
  by_category: Record<string, number>;
  by_status: Record<string, number>;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  error?: string | null;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface CreateComplaintPayload {
  title: string;
  description: string;
  category: string;
  location: string;
}

export interface UpdateComplaintPayload {
  title?: string;
  description?: string;
  category?: string;
  location?: string;
  priority?: ComplaintPriority | string;
}

export interface ComplaintFilters {
  reference_number?: string;
  status?: string;
  category?: string;
  priority?: string;
  department_id?: number;
  sla_escalated?: boolean;
  page?: number;
  page_size?: number;
}

export interface ReportFilters {
  from?: string;
  to?: string;
}

export interface CategoryReportRow {
  category: string;
  count: number;
}

export interface StatusReportRow {
  status: ComplaintStatus;
  count: number;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
}