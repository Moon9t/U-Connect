import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { DepartmentService } from '../services/department.service';
import { sendSuccess, sendError } from '../utils/response';

export class AdminController {
  constructor(
    private authService: AuthService,
    private departmentService: DepartmentService
  ) {}

  listUsers = (_req: Request, res: Response): void => {
    try {
      const users = this.authService.getAllUsers();
      sendSuccess(res, users, 200);
    } catch (err: any) {
      sendError(res, err.message || 'failed to list users', 500);
    }
  };

  updateUserRole = (req: Request, res: Response): void => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'invalid user ID', 400);
        return;
      }

      const { role } = req.body;
      if (!role) {
        sendError(res, 'valid role is required', 400);
        return;
      }

      this.authService.updateUserRole(id, role);
      sendSuccess(res, { message: 'user role updated successfully' }, 200);
    } catch (err: any) {
      const status = err.message === 'user not found' ? 404 : 400;
      sendError(res, err.message || 'failed to update user role', status);
    }
  };

  createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, email, password, role, department_id } = req.body;
      const deptId = department_id ? parseInt(String(department_id), 10) : null;
      const user = await this.authService.createUser({
        name,
        email,
        password,
        role,
        department_id: deptId,
      });
      sendSuccess(res, user, 201);
    } catch (err: any) {
      sendError(res, err.message || 'failed to create user', 400);
    }
  };

  toggleUserStatus = (req: Request, res: Response): void => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'invalid user ID', 400);
        return;
      }

      const { is_active } = req.body;
      if (is_active === undefined) {
        sendError(res, 'is_active boolean is required', 400);
        return;
      }

      this.authService.toggleUserActive(id, Boolean(is_active));
      sendSuccess(res, { message: `user status updated to ${is_active ? 'active' : 'deactivated'}` }, 200);
    } catch (err: any) {
      const status = err.message === 'user not found' ? 404 : 400;
      sendError(res, err.message || 'failed to update user status', status);
    }
  };

  deleteUser = (req: Request, res: Response): void => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'invalid user ID', 400);
        return;
      }

      this.authService.deleteUser(id);
      sendSuccess(res, { message: 'user deleted successfully' }, 200);
    } catch (err: any) {
      const status = err.message === 'user not found' ? 404 : 400;
      sendError(res, err.message || 'failed to delete user', status);
    }
  };

  createDepartment = (req: Request, res: Response): void => {
    try {
      const { name, code, description } = req.body;
      const dept = this.departmentService.create({ name, code, description });
      sendSuccess(res, dept, 201);
    } catch (err: any) {
      sendError(res, err.message || 'failed to create department', 400);
    }
  };

  updateDepartment = (req: Request, res: Response): void => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'invalid department ID', 400);
        return;
      }
      const updated = this.departmentService.update(id, req.body);
      sendSuccess(res, updated, 200);
    } catch (err: any) {
      const status = err.message === 'department not found' ? 404 : 400;
      sendError(res, err.message || 'failed to update department', status);
    }
  };

  deleteDepartment = (req: Request, res: Response): void => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'invalid department ID', 400);
        return;
      }
      this.departmentService.delete(id);
      sendSuccess(res, { message: 'department deleted successfully' }, 200);
    } catch (err: any) {
      const status = err.message === 'department not found' ? 404 : 400;
      sendError(res, err.message || 'failed to delete department', status);
    }
  };
}
