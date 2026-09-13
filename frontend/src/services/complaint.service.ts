import { request, downloadBlob } from './apiClient';
import { ApiResponse, PaginatedResponse, Complaint, Comment, CreateComplaintPayload, ComplaintFilters } from '../types/api';

export const complaintService = {
  async getComplaints(filters: ComplaintFilters = {}): Promise<PaginatedResponse<Complaint>> {
    return request<PaginatedResponse<Complaint>>('/api/complaints', {
      method: 'GET',
      params: {
        status: filters.status,
        category: filters.category,
        priority: filters.priority,
        department_id: filters.department_id,
        sla_escalated: filters.sla_escalated,
        page: filters.page || 1,
        page_size: filters.page_size || 20,
      },
    });
  },

  async getComplaint(id: number): Promise<Complaint> {
    const res = await request<ApiResponse<Complaint>>(`/api/complaints/${id}`, {
      method: 'GET',
    });
    return res.data;
  },

  async createComplaint(payload: CreateComplaintPayload): Promise<Complaint> {
    const res = await request<ApiResponse<Complaint>>('/api/complaints', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async updateStatus(id: number, status: string): Promise<Complaint> {
    const res = await request<ApiResponse<Complaint>>(`/api/complaints/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    return res.data;
  },

  async getComments(complaintId: number): Promise<Comment[]> {
    const res = await request<ApiResponse<Comment[]>>(`/api/complaints/${complaintId}/comments`, {
      method: 'GET',
    });
    return res.data;
  },

  async addComment(complaintId: number, content: string): Promise<Comment> {
    const res = await request<ApiResponse<Comment>>(`/api/complaints/${complaintId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    return res.data;
  },

  async exportCSV(filters: ComplaintFilters = {}): Promise<void> {
    const blob = await downloadBlob('/api/complaints/export/csv', {
      status: filters.status,
      category: filters.category,
      priority: filters.priority,
      department_id: filters.department_id,
      sla_escalated: filters.sla_escalated,
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `complaints_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
