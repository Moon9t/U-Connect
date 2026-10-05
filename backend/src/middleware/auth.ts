import { NextFunction, Request, Response } from 'express';
import { verifyToken, AuthUser } from '../utils/auth.js';
import { db } from '../config/database.js';

declare global { namespace Express { interface Request { user?: AuthUser } } }

export function authenticate(req:Request,res:Response,next:NextFunction) {
  const header = req.header('Authorization');
  if (!header?.startsWith('Bearer ')) return res.status(401).json({error:'Authorization token required'});
  try {
    const user = verifyToken(header.slice(7));
    const row = db.prepare('SELECT id, username, email, role, is_active FROM users WHERE id=?').get(user.user_id) as any;
    if (!row || !row.is_active) return res.status(401).json({error:'User account is inactive'});
    req.user = {user_id:row.id, username:row.username, email:row.email, role:row.role};
    next();
  } catch { return res.status(401).json({error:'Invalid or expired token'}); }
}

export function requireRole(...roles:string[]) {
  return (req:Request,res:Response,next:NextFunction) => {
    if (!req.user || !roles.includes(req.user.role.toLowerCase())) return res.status(403).json({error:'Forbidden'});
    next();
  };
}
