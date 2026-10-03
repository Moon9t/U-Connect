import { Router } from 'express'; import { db, nowIso } from '../config/database.js'; import { authenticate } from '../middleware/auth.js'; import { fail, ok } from '../utils/response.js';
const router=Router();router.use(authenticate);
router.get('/',(req,res)=>ok(res,db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC').all(req.user!.user_id)));
router.put('/read-all',(req,res)=>{db.prepare('UPDATE notifications SET read_at=?,updated_at=? WHERE user_id=? AND read_at IS NULL').run(nowIso(),nowIso(),req.user!.user_id);return ok(res,{read:true})});
router.put('/:id/read',(req,res)=>{const r=db.prepare('UPDATE notifications SET read_at=?,updated_at=? WHERE id=? AND user_id=?').run(nowIso(),nowIso(),Number(req.params.id),req.user!.user_id);if(!r.changes)return fail(res,404,'Notification not found');return ok(res,{read:true})});
export default router;
