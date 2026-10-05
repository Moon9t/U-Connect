import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth';

export function createAdminRouter(controller: AdminController): Router {
  const router = Router();

  router.use(authMiddleware as any);
  router.use(roleMiddleware('admin') as any);

  router.get('/users', controller.listUsers as any);
  router.post('/users', controller.createUser as any);
  router.put('/users/:id/role', controller.updateUserRole as any);
  router.put('/users/:id/status', controller.toggleUserStatus as any);
  router.delete('/users/:id', controller.deleteUser as any);
  router.post('/departments', controller.createDepartment as any);
  router.put('/departments/:id', controller.updateDepartment as any);
  router.delete('/departments/:id', controller.deleteDepartment as any);

  return router;
}
