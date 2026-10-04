import { Router } from 'express';
import { DepartmentController } from '../controllers/department.controller';
import { authMiddleware } from '../middleware/auth';

export function createDepartmentRouter(controller: DepartmentController): Router {
  const router = Router();
  router.use(authMiddleware as any);
  router.get('/', controller.list as any);
  return router;
}
