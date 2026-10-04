import { Request, Response } from 'express';
import { DepartmentService } from '../services/department.service';
import { sendSuccess, sendError } from '../utils/response';

export class DepartmentController {
  constructor(private departmentService: DepartmentService) {}

  list = (_req: Request, res: Response): void => {
    try {
      const depts = this.departmentService.list();
      sendSuccess(res, depts, 200);
    } catch (err: any) {
      sendError(res, err.message || 'failed to list departments', 500);
    }
  };

  create = (req: Request, res: Response): void => {
    try {
      const { name, code, description } = req.body;
      const dept = this.departmentService.create({ name, code, description });
      sendSuccess(res, dept, 201);
    } catch (err: any) {
      sendError(res, err.message || 'failed to create department', 400);
    }
  };

  update = (req: Request, res: Response): void => {
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

  delete = (req: Request, res: Response): void => {
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
