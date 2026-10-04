import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { sendError } from '../utils/response';
import { Role } from '../models/types';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      sendError(res, "invalid authorization header format. Expected 'Bearer <token>'", 401);
      return;
    }
    token = parts[1].trim();
  } else if (req.query && req.query.token) {
    token = String(req.query.token).trim();
  }

  if (!token) {
    sendError(res, 'authorization token required', 401);
    return;
  }

  try {
    const claims = verifyToken(token);
    req.user = claims;
    next();
  } catch (error) {
    sendError(res, 'invalid or expired authentication token', 401);
  }
}

export function roleMiddleware(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'unauthorized: token claims missing', 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(res, 'forbidden: insufficient permissions for this operation', 403);
      return;
    }

    next();
  };
}
