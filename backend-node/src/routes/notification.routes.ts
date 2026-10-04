import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middleware/auth';

export function createNotificationRouter(controller: NotificationController): Router {
  const router = Router();
  router.use(authMiddleware as any);

  router.get('/', controller.list as any);
  router.put('/read-all', controller.markAllRead as any);
  router.put('/:id/read', controller.markRead as any);

  return router;
}
