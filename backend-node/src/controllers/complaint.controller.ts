import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { AuthenticatedRequest } from '../middleware/auth';
import { ComplaintService } from '../services/complaint.service';
import { UPLOAD_DIR } from '../middleware/upload';
import {
  sendSuccess,
  sendSuccessWithMessage,
  sendPaginatedSuccess,
  sendError,
} from '../utils/response';

export class ComplaintController {
  constructor(private complaintService: ComplaintService) {}

  create = (req: AuthenticatedRequest, res: Response): void => {
    try {
      const user = req.user!;
      const files = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : undefined);
      const { complaint, message } = this.complaintService.createComplaint(
        user.user_id,
        user.role,
        req.body,
        files
      );
      sendSuccessWithMessage(res, message, complaint, 201);
    } catch (err: any) {
      sendError(res, err.message || 'failed to submit complaint', 400);
    }
  };

  list = (req: AuthenticatedRequest, res: Response): void => {
    try {
      const user = req.user!;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const pageSize = req.query.page_size ? parseInt(req.query.page_size as string, 10) : 20;

      let slaEscalated: boolean | undefined = undefined;
      if (req.query.sla_escalated !== undefined) {
        slaEscalated = String(req.query.sla_escalated).toLowerCase() === 'true';
      }

      const departmentId = req.query.department_id
        ? parseInt(req.query.department_id as string, 10)
        : undefined;

      const { complaints, total, totalPages } = this.complaintService.listComplaints(
        {
          status: req.query.status as string,
          category: req.query.category as string,
          priority: req.query.priority as string,
          department_id: departmentId,
          sla_escalated: slaEscalated,
          search: req.query.search ? String(req.query.search) : undefined,
          page,
          page_size: pageSize,
        },
        user.role,
        user.user_id
      );

      sendPaginatedSuccess(res, complaints, total, page, pageSize, totalPages, 200);
    } catch (err: any) {
      sendError(res, err.message || 'failed to retrieve complaints', 500);
    }
  };

  getById = (req: AuthenticatedRequest, res: Response): void => {
    try {
      const user = req.user!;
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'invalid complaint ID', 400);
        return;
      }

      const complaint = this.complaintService.getComplaintById(id, user.user_id, user.role);
      if (!complaint) {
        sendError(res, 'complaint not found', 404);
        return;
      }

      sendSuccess(res, complaint, 200);
    } catch (err: any) {
      const status = err.message.includes('forbidden') ? 403 : 500;
      sendError(res, err.message || 'failed to get complaint', status);
    }
  };

  updateStatus = (req: AuthenticatedRequest, res: Response): void => {
    try {
      const user = req.user!;
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'invalid complaint ID', 400);
        return;
      }

      const { status } = req.body;
      if (!status) {
        sendError(res, 'status field is required', 400);
        return;
      }

      const updated = this.complaintService.updateStatus(id, status, user.role);
      sendSuccess(res, updated, 200);
    } catch (err: any) {
      let statusCode = 400;
      if (err.message === 'complaint not found') statusCode = 404;
      else if (err.message.includes('forbidden')) statusCode = 403;
      sendError(res, err.message || 'failed to update status', statusCode);
    }
  };

  addComment = (req: AuthenticatedRequest, res: Response): void => {
    try {
      const user = req.user!;
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'invalid complaint ID', 400);
        return;
      }

      const { content } = req.body;
      if (!content) {
        sendError(res, 'comment content is required', 400);
        return;
      }

      const comment = this.complaintService.addComment(id, user.user_id, user.role, content);
      sendSuccess(res, comment, 201);
    } catch (err: any) {
      let statusCode = 400;
      if (err.message === 'complaint not found') statusCode = 404;
      else if (err.message.includes('forbidden')) statusCode = 403;
      sendError(res, err.message || 'failed to add comment', statusCode);
    }
  };

  listComments = (req: AuthenticatedRequest, res: Response): void => {
    try {
      const user = req.user!;
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'invalid complaint ID', 400);
        return;
      }

      const comments = this.complaintService.getComments(id, user.user_id, user.role);
      sendSuccess(res, comments, 200);
    } catch (err: any) {
      let statusCode = 400;
      if (err.message === 'complaint not found') statusCode = 404;
      else if (err.message.includes('forbidden')) statusCode = 403;
      sendError(res, err.message || 'failed to retrieve comments', statusCode);
    }
  };

  exportCSV = (req: AuthenticatedRequest, res: Response): void => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'staff') {
        sendError(res, 'forbidden: only staff and admin can export complaints', 403);
        return;
      }

      let slaEscalated: boolean | undefined = undefined;
      if (req.query.sla_escalated !== undefined) {
        slaEscalated = String(req.query.sla_escalated).toLowerCase() === 'true';
      }

      const departmentId = req.query.department_id
        ? parseInt(req.query.department_id as string, 10)
        : undefined;

      const csvData = this.complaintService.exportCSV({
        status: req.query.status as string,
        category: req.query.category as string,
        priority: req.query.priority as string,
        department_id: departmentId,
        sla_escalated: slaEscalated,
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=complaints.csv');
      res.status(200).send(csvData);
    } catch (err: any) {
      sendError(res, err.message || 'failed to generate CSV export', 500);
    }
  };

  exportPDF = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      if (user.role !== 'admin' && user.role !== 'staff') {
        sendError(res, 'forbidden: only staff and admin can export complaints', 403);
        return;
      }

      let slaEscalated: boolean | undefined = undefined;
      if (req.query.sla_escalated !== undefined) {
        slaEscalated = String(req.query.sla_escalated).toLowerCase() === 'true';
      }

      const departmentId = req.query.department_id
        ? parseInt(req.query.department_id as string, 10)
        : undefined;

      const pdfBuffer = await this.complaintService.exportPDF({
        status: req.query.status as string,
        category: req.query.category as string,
        priority: req.query.priority as string,
        department_id: departmentId,
        sla_escalated: slaEscalated,
        search: req.query.search ? String(req.query.search) : undefined,
      });

      const today = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=complaints_report_${today}.pdf`
      );
      res.status(200).send(pdfBuffer);
    } catch (err: any) {
      sendError(res, err.message || 'failed to generate PDF export', 500);
    }
  };

  addAttachments = (req: AuthenticatedRequest, res: Response): void => {
    try {
      const user = req.user!;
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'invalid complaint ID', 400);
        return;
      }

      const files = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : []);
      if (!files || files.length === 0) {
        sendError(res, 'no files provided', 400);
        return;
      }

      const attachments = this.complaintService.addAttachments(id, user.user_id, user.role, files);
      sendSuccessWithMessage(res, 'Attachments uploaded successfully', attachments, 201);
    } catch (err: any) {
      const status = err.message.includes('forbidden') ? 403 : 400;
      sendError(res, err.message || 'failed to add attachments', status);
    }
  };

  getAttachment = (req: AuthenticatedRequest, res: Response): void => {
    try {
      const user = req.user!;
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'invalid attachment ID', 400);
        return;
      }

      const attachment = this.complaintService.getAttachmentById(id);
      if (!attachment) {
        sendError(res, 'attachment not found', 404);
        return;
      }

      // Check complaint access authorization
      const complaint = this.complaintService.getComplaintById(attachment.complaint_id, user.user_id, user.role);
      if (!complaint) {
        sendError(res, 'complaint not found', 404);
        return;
      }

      const filePath = path.resolve(UPLOAD_DIR, attachment.file_path);
      if (!fs.existsSync(filePath)) {
        sendError(res, 'attachment file missing from server', 404);
        return;
      }

      const isDownload = req.query.download === 'true';
      const disposition = isDownload ? 'attachment' : 'inline';
      res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(attachment.file_name)}"`);
      res.setHeader('Content-Type', attachment.file_type || 'application/octet-stream');
      res.sendFile(filePath);
    } catch (err: any) {
      const status = err.message.includes('forbidden') ? 403 : 500;
      sendError(res, err.message || 'failed to get attachment', status);
    }
  };

  deleteAttachment = (req: AuthenticatedRequest, res: Response): void => {
    try {
      const user = req.user!;
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'invalid attachment ID', 400);
        return;
      }

      this.complaintService.deleteAttachment(id, user.user_id, user.role);
      sendSuccessWithMessage(res, 'attachment deleted successfully', null, 200);
    } catch (err: any) {
      const status = err.message.includes('forbidden') ? 403 : 400;
      sendError(res, err.message || 'failed to delete attachment', status);
    }
  };
}
