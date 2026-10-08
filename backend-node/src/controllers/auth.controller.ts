import { Request, Response } from 'express';

import { AuthService } from '../services/auth.service';

import { sendSuccess, sendError } from '../utils/response';

export class AuthController {
  constructor(private authService: AuthService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, email, password, role, department_id } = req.body;

      if (!name || !email || !password) {
        sendError(res, 'name, email, and password are required', 400);
        return;
      }

      const result = await this.authService.register({
        name,
        email,
        password,
        role,
        department_id,
      });

      sendSuccess(res, result, 201);
    } catch (err: any) {
      sendError(res, err.message || 'registration failed', 400);
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const identifier = req.body.email || req.body.username;

      const { password } = req.body;

      if (!identifier || !password) {
        sendError(
          res,
          'email or username and password are required',
          400
        );
        return;
      }

      const result = await this.authService.login(
        identifier,
        password
      );

      sendSuccess(res, result, 200);
    } catch (err: any) {
      const status =
        err.message === 'invalid email or password' ||
        err.message.includes('deactivated') ||
        err.message.includes('account locked')
          ? 401
          : 500;

      sendError(
        res,
        err.message || 'login failed',
        status
      );
    }
  };
}