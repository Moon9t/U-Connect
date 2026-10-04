import { NextFunction, Request, Response } from 'express';
import { verifyToken, AuthUser } from '../utils/auth.js';
import { db } from '../config/database.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const header = req.header('Authorization');

  if (!header?.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ error: 'Authorization token required' });
  }

  try {
    const tokenUser = verifyToken(header.slice(7));

    const row = db
      .prepare(
        `SELECT
           u.user_id,
           u.username,
           u.email,
           u.is_active,
           r.role_name
         FROM users u
         JOIN roles r ON r.role_id = u.role_id
         WHERE u.user_id = ?`,
      )
      .get(tokenUser.user_id) as
      | {
          user_id: number;
          username: string;
          email: string;
          is_active: number;
          role_name: string;
        }
      | undefined;

    if (!row || !row.is_active) {
      return res
        .status(401)
        .json({ error: 'User account is inactive' });
    }

    req.user = {
      user_id: row.user_id,
      username: row.username,
      email: row.email,
      role: row.role_name,
    };

    next();
  } catch {
    return res
      .status(401)
      .json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (
      !req.user ||
      !roles.includes(req.user.role.toLowerCase())
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}

