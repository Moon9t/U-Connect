import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middleware/auth';

export function createDashboardRouter(controller: DashboardController): Router {
  const router = Router();
  router.use(authMiddleware as any);
  router.get('/', controller.getStats as any);
  return router;
}
