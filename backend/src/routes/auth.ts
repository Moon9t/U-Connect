import { Router } from 'express';
import { db, nowIso } from '../config/database.js';
import { comparePassword, hashPassword, signToken } from '../utils/auth.js';
import { fail, ok } from '../utils/response.js';
import { loginSchema, registerSchema } from '../validators/schemas.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const attempts = new Map<string,{count:number,lockedUntil:number}>();

router.post('/login', async (req,res) => {
  const parsed = loginSchema.safeParse(req.body); if (!parsed.success) return fail(res,400,'Invalid login payload');
  const {username,password} = parsed.data; const key=username.toLowerCase(); const state=attempts.get(key);
  if (state && state.lockedUntil > Date.now()) return fail(res,423,'Account temporarily locked');
  if (state && state.lockedUntil <= Date.now()) attempts.delete(key);
  const user = db.prepare('SELECT * FROM users WHERE lower(username)=lower(?)').get(username) as any;
  if (!user || !user.is_active || !(await comparePassword(password,user.password_hash))) {
    const current=attempts.get(key) || {count:0,lockedUntil:0}; current.count++;
    if (current.count >= 5) { current.lockedUntil=Date.now()+15*60*1000; current.count=0; }
    attempts.set(key,current); return fail(res,401,'Invalid username or password');
  }
  attempts.delete(key);
  const safe={id:user.id,name:user.name,username:user.username,email:user.email,role:user.role,department_id:user.department_id};
  return ok(res,{user:safe,token:signToken({user_id:user.id,username:user.username,email:user.email,role:user.role})});
});

router.post('/register', async (req,res) => {
  const parsed=registerSchema.safeParse(req.body); if (!parsed.success) return fail(res,400,'Invalid registration payload');
  const p=parsed.data;
  const exists=db.prepare('SELECT id FROM users WHERE lower(username)=lower(?) OR lower(email)=lower(?)').get(p.username,p.email);
  if (exists) return fail(res,409,'Username or email already exists');
  const t=nowIso(); const result=db.prepare(`INSERT INTO users(name,username,email,password_hash,role,department_id,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`).run(p.name,p.username,p.email,await hashPassword(p.password),p.role,p.department_id??null,1,t,t);
  const user={id:Number(result.lastInsertRowid),name:p.name,username:p.username,email:p.email,role:p.role,department_id:p.department_id??null};
  return ok(res,{user,token:signToken({user_id:user.id,username:user.username,email:user.email,role:user.role})},'Registration successful');
});

router.post('/logout', authenticate, (_req,res)=>res.status(204).send());
export default router;
