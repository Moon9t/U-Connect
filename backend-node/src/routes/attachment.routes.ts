import { Router } from 'express';
import { ComplaintController } from '../controllers/complaint.controller';
import { authMiddleware } from '../middleware/auth';

export function createAttachmentRouter(controller: ComplaintController): Router {
  const router = Router();

  router.use(authMiddleware as any);

  router.get('/:id', controller.getAttachment as any);
  router.delete('/:id', controller.deleteAttachment as any);

  return router;
}
