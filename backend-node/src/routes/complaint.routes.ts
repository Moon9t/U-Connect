import { Router } from 'express';
import { ComplaintController } from '../controllers/complaint.controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth';
import { upload, handleUpload } from '../middleware/upload';

export function createComplaintRouter(controller: ComplaintController): Router {
  const router = Router();

  router.use(authMiddleware as any);

  // Sub-routes before :id route
  router.get('/export/csv', roleMiddleware('admin', 'staff') as any, controller.exportCSV as any);
  router.get('/export/pdf', roleMiddleware('admin', 'staff') as any, controller.exportPDF as any);

  router.post('/', handleUpload(upload.array('files', 5)) as any, controller.create as any);
  router.get('/', controller.list as any);
  router.get('/:id', controller.getById as any);
  router.put('/:id/status', roleMiddleware('admin', 'staff') as any, controller.updateStatus as any);
  router.post('/:id/comments', controller.addComment as any);
  router.get('/:id/comments', controller.listComments as any);
  router.post('/:id/attachments', handleUpload(upload.array('files', 5)) as any, controller.addAttachments as any);

  return router;
}
