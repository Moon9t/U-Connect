import { request, downloadBlob } from './apiClient';
import { ApiResponse, PaginatedResponse, Complaint, Comment, CreateComplaintPayload, ComplaintFilters, Attachment } from '../types/api';

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
        search: filters.search,
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

  getAttachmentViewUrl(attachmentId: number): string {
    const token = localStorage.getItem('uconnect_token') || '';
    return `/api/attachments/${attachmentId}?token=${encodeURIComponent(token)}`;
  },

  async downloadAttachment(attachmentId: number, fileName: string): Promise<void> {
    const blob = await downloadBlob(`/api/attachments/${attachmentId}`, { download: true });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
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
      search: filters.search,
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

  async exportPDF(filters: ComplaintFilters = {}): Promise<void> {
    const blob = await downloadBlob('/api/complaints/export/pdf', {
      status: filters.status,
      category: filters.category,
      priority: filters.priority,
      department_id: filters.department_id,
      sla_escalated: filters.sla_escalated,
      search: filters.search,
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `complaints_report_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
