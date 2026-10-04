import { Router, Request, Response } from 'express';
import { DatabaseSync } from 'node:sqlite';

import { AuthService } from '../services/auth.service';
import { DepartmentService } from '../services/department.service';
import { ComplaintService } from '../services/complaint.service';
import { NotificationService } from '../services/notification.service';
import { DashboardService } from '../services/dashboard.service';

import { AuthController } from '../controllers/auth.controller';
import { DepartmentController } from '../controllers/department.controller';
import { ComplaintController } from '../controllers/complaint.controller';
import { NotificationController } from '../controllers/notification.controller';
import { DashboardController } from '../controllers/dashboard.controller';
import { AdminController } from '../controllers/admin.controller';

import { createAuthRouter } from './auth.routes';
import { createComplaintRouter } from './complaint.routes';
import { createDashboardRouter } from './dashboard.routes';
import { createDepartmentRouter } from './department.routes';
import { createNotificationRouter } from './notification.routes';
import { createAdminRouter } from './admin.routes';
import { createAttachmentRouter } from './attachment.routes';

export function createApiRouter(db: DatabaseSync): Router {
  const router = Router();

  // Instantiate services
  const authService = new AuthService(db);
  const departmentService = new DepartmentService(db);
  const notificationService = new NotificationService(db);
  const complaintService = new ComplaintService(db, notificationService);
  const dashboardService = new DashboardService(db);

  // Instantiate controllers
  const authController = new AuthController(authService);
  const departmentController = new DepartmentController(departmentService);
  const complaintController = new ComplaintController(complaintService);
  const notificationController = new NotificationController(notificationService);
  const dashboardController = new DashboardController(dashboardService);
  const adminController = new AdminController(authService, departmentService);

  // Mount API groups
  router.use('/auth', createAuthRouter(authController));
  router.use('/complaints', createComplaintRouter(complaintController));
  router.use('/attachments', createAttachmentRouter(complaintController));
  router.use('/dashboard', createDashboardRouter(dashboardController));
  router.use('/departments', createDepartmentRouter(departmentController));
  router.use('/notifications', createNotificationRouter(notificationController));
  router.use('/admin', createAdminRouter(adminController));

  return router;
}
