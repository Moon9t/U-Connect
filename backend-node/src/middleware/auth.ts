import {
  Request,
  Response,
  NextFunction,
} from 'express';

import {
  verifyToken,
  TokenPayload,
} from '../utils/jwt';

import { sendError } from '../utils/response';
import { Role } from '../models/types';
import { env } from '../config/env';

export interface AuthenticatedRequest
  extends Request {
  user?: TokenPayload;
}

/**
 * FR03
 *
 * Tracks the last authenticated activity for
 * each active JWT session.
 *
 * The JWT itself remains valid for its normal
 * expiration period, but authentication is
 * rejected when the session has been inactive
 * for longer than SESSION_INACTIVITY_MINUTES.
 */
const sessionActivity = new Map<
  string,
  number
>();

const INACTIVITY_TIMEOUT_MS =
  env.SESSION_INACTIVITY_MINUTES *
  60 *
  1000;

/**
 * Remove expired/inactive session records.
 *
 * This prevents the in-memory map from growing
 * indefinitely as users authenticate over time.
 */
function cleanupInactiveSessions(): void {
  const now = Date.now();

  for (const [
    token,
    lastActivity,
  ] of sessionActivity.entries()) {
    if (
      now - lastActivity >=
      INACTIVITY_TIMEOUT_MS
    ) {
      sessionActivity.delete(token);
    }
  }
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  let token: string | undefined;

  const authHeader =
    req.headers.authorization;

  if (authHeader) {
    const parts =
      authHeader.split(' ');

    if (
      parts.length !== 2 ||
      parts[0].toLowerCase() !==
        'bearer'
    ) {
      sendError(
        res,
        "invalid authorization header format. Expected 'Bearer <token>'",
        401
      );
      return;
    }

    token = parts[1].trim();
  } else if (
    req.query &&
    req.query.token
  ) {
    token = String(
      req.query.token
    ).trim();
  }

  if (!token) {
    sendError(
      res,
      'authorization token required',
      401
    );
    return;
  }

  try {
    const claims =
      verifyToken(token);

    const now = Date.now();

    cleanupInactiveSessions();

    const lastActivity =
      sessionActivity.get(token);

    /*
     * A token with no existing activity record
     * is treated as a newly authenticated session.
     *
     * This is important because login itself does
     * not pass through authMiddleware.
     */
    if (
      lastActivity !== undefined &&
      now - lastActivity >=
        INACTIVITY_TIMEOUT_MS
    ) {
      sessionActivity.delete(token);

      sendError(
        res,
        'session expired due to inactivity. Please log in again',
        401
      );
      return;
    }

    /*
     * Valid authenticated activity refreshes
     * the inactivity timer.
     */
    sessionActivity.set(
      token,
      now
    );

    req.user = claims;

    next();
  } catch (_error) {
    sessionActivity.delete(token);

    sendError(
      res,
      'invalid or expired authentication token',
      401
    );
  }
}

export function roleMiddleware(
  ...allowedRoles: Role[]
) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      sendError(
        res,
        'unauthorized: token claims missing',
        401
      );
      return;
    }

    if (
      !allowedRoles.includes(
        req.user.role
      )
    ) {
      sendError(
        res,
        'forbidden: insufficient permissions for this operation',
        403
      );
      return;
    }

    next();
  };
}
