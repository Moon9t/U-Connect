import { db, nowIso } from '../config/database.js';
export function audit(userId:number|undefined, action:string, table:string, recordId:number|undefined) {
  db.prepare('INSERT INTO audit_log(user_id,action,table_affected,record_id,timestamp) VALUES (?,?,?,?,?)').run(userId ?? null, action, table, recordId ?? null, nowIso());
}
