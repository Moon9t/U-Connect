import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const secret = () => process.env.JWT_SECRET || 'change-this-development-secret';
const expiresIn = (process.env.JWT_EXPIRATION_HOURS ? `${process.env.JWT_EXPIRATION_HOURS}h` : '24h') as jwt.SignOptions['expiresIn'];

export type AuthUser = { user_id:number; username:string; email:string; role:string };
export function signToken(user: AuthUser) { return jwt.sign(user, secret(), { expiresIn, issuer:'u-connect-backend' }); }
export function verifyToken(token:string): AuthUser { return jwt.verify(token, secret(), { issuer:'u-connect-backend' }) as AuthUser; }
export async function hashPassword(password:string) { return bcrypt.hash(password, 14); }
export async function comparePassword(password:string, hash:string) { return bcrypt.compare(password, hash); }
