import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { NotificationService } from '../services/notification.service';
import { sendSuccess, sendError } from '../utils/response';

export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  list = (req: AuthenticatedRequest, res: Response): void => {
    try {
      const user = req.user!;
      const notifications = this.notificationService.list(user.user_id);
      sendSuccess(res, notifications, 200);
    } catch (err: any) {
      sendError(res, err.message || 'failed to retrieve notifications', 500);
    }
  };

  markRead = (req: AuthenticatedRequest, res: Response): void => {
    try {
      const user = req.user!;
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'invalid notification ID', 400);
        return;
      }

      this.notificationService.markRead(id, user.user_id);
      sendSuccess(res, { read: true }, 200);
    } catch (err: any) {
      const status = err.message === 'notification not found' ? 404 : 500;
      sendError(res, err.message || 'failed to mark notification as read', status);
    }
  };

  markAllRead = (req: AuthenticatedRequest, res: Response): void => {
    try {
      const user = req.user!;
      this.notificationService.markAllRead(user.user_id);
      sendSuccess(res, { read: true }, 200);
    } catch (err: any) {
      sendError(res, err.message || 'failed to mark notifications as read', 500);
    }
  };
}
