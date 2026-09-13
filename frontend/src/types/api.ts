export type UserRole = 'admin' | 'staff' | 'student';

export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  department_id?: number | null;
  department?: Department | null;
  created_at?: string;
  updated_at?: string;
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

export type ComplaintStatus = 'pending' | 'in-progress' | 'resolved' | 'closed';

export interface Comment {
  id: number;
  complaint_id: number;
  user_id: number;
  user?: User | null;
  role: UserRole;
  content: string;
  created_at: string;
}

export interface Complaint {
  id: number;
  title: string;
  description: string;
  category: ComplaintCategory | string;
  priority: ComplaintPriority | string;
  status: ComplaintStatus;
  anonymous: boolean;
  sla_escalated: boolean;
  user_id: number;
  user?: User | null;
  department_id: number;
  department?: Department | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
  comments?: Comment[];
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
  department_id: number;
  anonymous?: boolean;
}

export interface ComplaintFilters {
  status?: string;
  category?: string;
  priority?: string;
  department_id?: number;
  sla_escalated?: boolean;
  page?: number;
  page_size?: number;
  search?: string;
}
