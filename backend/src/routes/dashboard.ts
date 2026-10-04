import { Router } from 'express';
import { db } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { ok } from '../utils/response.js';

const router = Router();

router.use(authenticate);

const SLA_HOURS = 72;
const SLA_MS = SLA_HOURS * 60 * 60 * 1000;

router.get('/', (req, res) => {
  const isStudent = req.user!.role === 'student';

  const where = isStudent ? 'WHERE c.user_id = ?' : '';
  const args: (string | number)[] = isStudent
    ? [req.user!.user_id]
    : [];

  const rows = db
    .prepare(
      `SELECT c.status, COUNT(*) AS count
       FROM complaints c
       ${where}
       GROUP BY c.status`
    )
    .all(...args) as Array<{
      status: string;
      count: number;
    }>;

  const byStatus: Record<string, number> = {
    pending: 0,
    'in-progress': 0,
    resolved: 0,
    closed: 0,
  };

  for (const row of rows) {
    byStatus[row.status] = Number(row.count);
  }

  const categories = db
    .prepare(
      `SELECT
         cat.category_name AS category,
         COUNT(*) AS count
       FROM complaints c
       JOIN categories cat
         ON cat.category_id = c.category_id
       ${where}
       GROUP BY cat.category_id, cat.category_name
       ORDER BY cat.category_name`
    )
    .all(...args) as Array<{
      category: string;
      count: number;
    }>;

  const byCategory: Record<string, number> = {};

  for (const row of categories) {
    byCategory[row.category] = Number(row.count);
  }

  /*
   * The SDD does not define a complaints.resolved_at column.
   *
   * Resolution history is stored in complaint_updates.
   * Therefore:
   *
   * - unresolved complaints breach SLA when more than 72 hours
   *   have elapsed since submission;
   *
   * - resolved/closed complaints breach SLA only when a recorded
   *   "resolved" update exists and resolution took more than 72 hours.
   */
  const slaWhere = isStudent
    ? 'WHERE c.user_id = ?'
    : '';

  const slaArgs: (string | number)[] = isStudent
    ? [req.user!.user_id]
    : [];

  const slaRows = db
    .prepare(
      `SELECT
         c.complaint_id,
         c.status,
         c.submitted_at,
         (
           SELECT MIN(cu.updated_at)
           FROM complaint_updates cu
           WHERE cu.complaint_id = c.complaint_id
             AND cu.status = 'resolved'
         ) AS resolved_at
       FROM complaints c
       ${slaWhere}`
    )
    .all(...slaArgs) as Array<{
      complaint_id: number;
      status: string;
      submitted_at: string | null;
      resolved_at: string | null;
    }>;

  const now = Date.now();

  let slaBreaches = 0;

  for (const complaint of slaRows) {
    if (!complaint.submitted_at) {
      continue;
    }

    const submittedAt = new Date(
      complaint.submitted_at
    ).getTime();

    if (Number.isNaN(submittedAt)) {
      continue;
    }

    /*
     * Pending and in-progress complaints are currently overdue
     * when they have remained open for more than 72 hours.
     */
    if (
      complaint.status === 'pending' ||
      complaint.status === 'in-progress'
    ) {
      if (now - submittedAt > SLA_MS) {
        slaBreaches++;
      }

      continue;
    }

    /*
     * Resolved and closed complaints use the first recorded
     * resolved update as the resolution timestamp.
     */
    if (
      complaint.status === 'resolved' ||
      complaint.status === 'closed'
    ) {
      if (!complaint.resolved_at) {
        continue;
      }

      const resolvedAt = new Date(
        complaint.resolved_at
      ).getTime();

      if (Number.isNaN(resolvedAt)) {
        continue;
      }

      if (resolvedAt - submittedAt > SLA_MS) {
        slaBreaches++;
      }
    }
  }

  /*
   * The SDD does not define a complaints.resolved_at column.
   *
   * Resolution time is calculated from submitted_at to the
   * first "resolved" complaint_update.
   */
  const resolvedWhere = isStudent
    ? `WHERE c.user_id = ?
       AND c.status IN ('resolved', 'closed')`
    : `WHERE c.status IN ('resolved', 'closed')`;

  const resolvedArgs: (string | number)[] = isStudent
    ? [req.user!.user_id]
    : [];

  const resolved = db
    .prepare(
      `SELECT
         c.submitted_at,
         (
           SELECT MIN(cu.updated_at)
           FROM complaint_updates cu
           WHERE cu.complaint_id = c.complaint_id
             AND cu.status = 'resolved'
         ) AS resolved_at
       FROM complaints c
       ${resolvedWhere}`
    )
    .all(...resolvedArgs) as Array<{
      submitted_at: string | null;
      resolved_at: string | null;
    }>;

  const resolvedWithDates = resolved.filter(
    (complaint) =>
      complaint.submitted_at &&
      complaint.resolved_at
  );

  let averageResolutionHours = 0;

  if (resolvedWithDates.length > 0) {
    averageResolutionHours =
      resolvedWithDates.reduce((sum, complaint) => {
        const submitted = new Date(
          complaint.submitted_at!
        ).getTime();

        const resolvedAt = new Date(
          complaint.resolved_at!
        ).getTime();

        return (
          sum +
          (resolvedAt - submitted) / 3600000
        );
      }, 0) / resolvedWithDates.length;
  }

  const totalComplaints = Object.values(byStatus).reduce(
    (sum, count) => sum + count,
    0
  );

  return ok(res, {
    total_complaints: totalComplaints,
    pending_complaints: byStatus.pending,
    in_progress_complaints: byStatus['in-progress'],
    resolved_complaints: byStatus.resolved,
    closed_complaints: byStatus.closed,
    sla_breaches: slaBreaches,
    average_resolution_hours: Number(
      averageResolutionHours.toFixed(2)
    ),
    by_category: byCategory,
    by_status: byStatus,
  });
});

export default router;