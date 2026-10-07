// src/routes/complaint.routes.ts

import { Router } from 'express';
import { ComplaintController } from '../controllers/complaint.controller';
import {
  authMiddleware,
  roleMiddleware,
} from '../middleware/auth';
import {
  upload,
  handleUpload,
} from '../middleware/upload';

export function createComplaintRouter(
  controller: ComplaintController
): Router {
  const router = Router();

  router.use(
    authMiddleware as any
  );

  router.get(
    '/export/csv',
    roleMiddleware(
      'admin',
      'staff'
    ) as any,
    controller.exportCSV as any
  );

  router.get(
    '/export/pdf',
    roleMiddleware(
      'admin',
      'staff'
    ) as any,
    controller.exportPDF as any
  );

  router.post(
    '/',
    handleUpload(
      upload.array('files', 5)
    ) as any,
    controller.create as any
  );

  router.get(
    '/',
    controller.list as any
  );

  router.put(
    '/:id/assign',
    roleMiddleware(
      'admin',
      'staff'
    ) as any,
    controller.assign as any
  );

  router.post(
    '/:id/feedback',
    controller.addFeedback as any
  );

  router.get(
    '/:id/feedback',
    controller.listFeedback as any
  );

  /**
   * FR07:
   * Staff/admin may edit complaint details.
   *
   * This must be before the generic /:id route.
   */
  router.put(
    '/:id',
    roleMiddleware(
      'admin',
      'staff'
    ) as any,
    controller.update as any
  );

  router.delete(
    '/:id',
    roleMiddleware(
      'admin'
    ) as any,
    controller.delete as any
  );

  router.get(
    '/:id',
    controller.getById as any
  );

  router.put(
    '/:id/status',
    roleMiddleware(
      'admin',
      'staff'
    ) as any,
    controller.updateStatus as any
  );

  router.post(
    '/:id/comments',
    controller.addComment as any
  );

  router.get(
    '/:id/comments',
    controller.listComments as any
  );

  router.post(
    '/:id/attachments',
    handleUpload(
      upload.array('files', 5)
    ) as any,
    controller.addAttachments as any
  );

  return router;
}