import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Role } from '../models/types';

export interface TokenPayload {
  user_id: number;
  email: string;
  role: Role;
}

export function generateToken(payload: TokenPayload, expiresInHours?: number): string {
  const hours = expiresInHours || env.JWT_EXPIRATION_HOURS;
  return jwt.sign(
    {
      user_id: payload.user_id,
      email: payload.email,
      role: payload.role,
    },
    env.JWT_SECRET,
    {
      expiresIn: `${hours}h`,
      issuer: 'u-connect-backend',
      subject: String(payload.user_id),
    }
  );
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}
