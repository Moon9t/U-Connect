import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { DashboardService } from '../services/dashboard.service';
import { sendSuccess, sendError } from '../utils/response';

export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  getStats = (req: AuthenticatedRequest, res: Response): void => {
    try {
      const user = req.user!;
      const stats = this.dashboardService.getStats(user.user_id, user.role);
      sendSuccess(res, stats, 200);
    } catch (err: any) {
      sendError(res, err.message || 'failed to compute dashboard metrics', 500);
    }
  };
}
