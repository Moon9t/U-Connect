import { request, downloadBlob } from './apiClient';
import {
  ApiResponse,
  PaginatedResponse,
  Complaint,
  Comment,
  Attachment,
  Feedback,
  CreateComplaintPayload,
  UpdateComplaintPayload,
  ComplaintFilters,
  ReportFilters,
  CategoryReportRow,
  StatusReportRow,
} from '../types/api';

function triggerDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export const complaintService = {
  async getComplaints(filters: ComplaintFilters = {}): Promise<PaginatedResponse<Complaint>> {
    return request<PaginatedResponse<Complaint>>('/api/complaints', {
      method: 'GET',
      params: {
        reference_number: filters.reference_number,
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
    const res = await request<ApiResponse<Complaint>>(`/api/complaints/${id}`, { method: 'GET' });
    return res.data;
  },

  async createComplaint(payload: CreateComplaintPayload): Promise<Complaint> {
    const res = await request<ApiResponse<Complaint>>('/api/complaints', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async updateComplaint(id: number, payload: UpdateComplaintPayload): Promise<Complaint> {
    const res = await request<ApiResponse<Complaint>>(`/api/complaints/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async deleteComplaint(id: number): Promise<void> {
    await request<ApiResponse<{ message: string }>>(`/api/complaints/${id}`, { method: 'DELETE' });
  },

  async assignComplaint(id: number, department_id: number): Promise<Complaint> {
    const res = await request<ApiResponse<Complaint>>(`/api/complaints/${id}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ department_id }),
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
    const res = await request<ApiResponse<Comment[]>>(`/api/complaints/${complaintId}/comments`, { method: 'GET' });
    return res.data || [];
  },

  async addComment(complaintId: number, content: string): Promise<Comment> {
    const res = await request<ApiResponse<Comment>>(`/api/complaints/${complaintId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    return res.data;
  },

  async uploadAttachment(complaintId: number, file: File): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await request<ApiResponse<Attachment>>(`/api/complaints/${complaintId}/attachments`, {
      method: 'POST',
      body: formData,
    });
    return res.data;
  },

  async getAttachments(complaintId: number): Promise<Attachment[]> {
    const res = await request<ApiResponse<Attachment[]>>(`/api/complaints/${complaintId}/attachments`, { method: 'GET' });
    return res.data || [];
  },

  async submitFeedback(complaintId: number, rating: number, comment?: string): Promise<Feedback> {
    const res = await request<ApiResponse<Feedback>>(`/api/complaints/${complaintId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    });
    return res.data;
  },

  async getFeedback(complaintId: number): Promise<Feedback[]> {
    const res = await request<ApiResponse<Feedback[]>>(`/api/complaints/${complaintId}/feedback`, { method: 'GET' });
    return res.data || [];
  },

  async exportReportPDF(filters: ReportFilters = {}): Promise<void> {
    const blob = await downloadBlob('/api/reports/complaints/export/pdf', {
      from: filters.from,
      to: filters.to,
    });
    triggerDownload(blob, `complaint_report_${new Date().toISOString().split('T')[0]}.pdf`);
  },

  async getReport(filters: ReportFilters = {}): Promise<Complaint[]> {
    const res = await request<ApiResponse<Complaint[]>>('/api/reports/complaints', {
      method: 'GET',
      params: { from: filters.from, to: filters.to },
    });
    return res.data || [];
  },

  async getComplaintsByCategory(filters: ReportFilters = {}): Promise<CategoryReportRow[]> {
    const res = await request<ApiResponse<CategoryReportRow[]>>('/api/reports/complaints/by-category', {
      method: 'GET',
      params: { from: filters.from, to: filters.to },
    });
    return res.data || [];
  },

  async getComplaintsByStatus(filters: ReportFilters = {}): Promise<StatusReportRow[]> {
    const res = await request<ApiResponse<StatusReportRow[]>>('/api/reports/complaints/by-status', {
      method: 'GET',
      params: { from: filters.from, to: filters.to },
    });
    return res.data || [];
  },

};
