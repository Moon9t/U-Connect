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
        search: filters.search,
        page: filters.page || 1,
        page_size: filters.page_size || 20,
      },
    });
  },

  async getComplaint(id: number): Promise<Complaint> {
    const res = await request<ApiResponse<Complaint>>(`/api/complaints/${id}`, { method: 'GET' });
    return res.data;
  },

  async createComplaint(payload: CreateComplaintPayload | FormData): Promise<Complaint> {
    let body: any;
    if (payload instanceof FormData) {
      body = payload;
    } else if (payload.files && payload.files.length > 0) {
      const formData = new FormData();
      formData.append('title', payload.title);
      formData.append('description', payload.description);
      formData.append('category', payload.category);
      formData.append('department_id', String(payload.department_id));
      if (payload.location) {
        formData.append('location', payload.location);
      }
      if (payload.anonymous !== undefined) {
        formData.append('anonymous', String(payload.anonymous));
      }
      payload.files.forEach((file) => {
        formData.append('files', file);
      });
      body = formData;
    } else {
      body = JSON.stringify(payload);
    }

    const res = await request<ApiResponse<Complaint>>('/api/complaints', {
      method: 'POST',
      body,
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

  async addAttachments(complaintId: number, files: File[]): Promise<Attachment[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const res = await request<ApiResponse<Attachment[]>>(`/api/complaints/${complaintId}/attachments`, {
      method: 'POST',
      body: formData,
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

  getAttachmentViewUrl(attachmentId: number): string {
    const token = localStorage.getItem('uconnect_token') || '';
    return `/api/attachments/${attachmentId}?token=${encodeURIComponent(token)}`;
  },

  async downloadAttachment(attachmentId: number, fileName: string): Promise<void> {
    const blob = await downloadBlob(`/api/attachments/${attachmentId}`, { download: true });
    triggerDownload(blob, fileName);
  },

  async getAttachments(complaintId: number): Promise<Attachment[]> {
    const res = await request<ApiResponse<Attachment[]>>(`/api/complaints/${complaintId}/attachments`, { method: 'GET' });
    return res.data || [];
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

  async exportCSV(filters: ComplaintFilters = {}): Promise<void> {
    const blob = await downloadBlob('/api/complaints/export/csv', {
      status: filters.status,
      category: filters.category,
      priority: filters.priority,
      department_id: filters.department_id,
      sla_escalated: filters.sla_escalated,
      search: filters.search,
    });
    triggerDownload(blob, `complaints_export_${new Date().toISOString().split('T')[0]}.csv`);
  },

  async exportPDF(filters: ComplaintFilters = {}): Promise<void> {
    try {
      const blob = await downloadBlob('/api/complaints/export/pdf', {
        status: filters.status,
        category: filters.category,
        priority: filters.priority,
        department_id: filters.department_id,
        sla_escalated: filters.sla_escalated,
        search: filters.search,
      });
      triggerDownload(blob, `complaints_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch {
      // Fallback to /api/reports/complaints/export/pdf
      const blob = await downloadBlob('/api/reports/complaints/export/pdf', {});
      triggerDownload(blob, `complaints_report_${new Date().toISOString().split('T')[0]}.pdf`);
    }
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
