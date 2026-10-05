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

export const Statuses = ['pending', 'in-progress', 'resolved', 'closed'] as const;
export type Status = (typeof Statuses)[number];

export interface Department {
  id: number;
  name: string;
  code: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  name: string;
  username?: string;
  email: string;
  password_hash?: string;
  role: Role;
  department_id: number | null;
  department?: Department | null;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

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

export interface Attachment {
  id: number;
  complaint_id: number;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  created_at: string;
}

export interface Complaint {
  id: number;
  title: string;
  description: string;
  category: Category | string;
  priority: Priority;
  status: Status;
  anonymous: boolean;
  sla_escalated: boolean;
  user_id: number;
  department_id: number;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  user?: Partial<User> | null;
  department?: Department | null;
  comments?: Comment[];
  attachments?: Attachment[];
}

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
  sla_breaches: number;
  average_resolution_hours: number;
  by_category: Record<string, number>;
  by_status: Record<string, number>;
}
