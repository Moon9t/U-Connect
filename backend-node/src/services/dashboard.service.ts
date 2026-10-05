import { DatabaseSync } from 'node:sqlite';
import { DashboardStats, Role } from '../models/types';
import { SLA_DURATION_HOURS } from './complaint.rules';

export class DashboardService {
  constructor(private db: DatabaseSync) {}

  getStats(requestingUserId: number, requestingRole: Role): DashboardStats {
    const isStudent = requestingRole === 'student';
    const userFilter = isStudent ? 'WHERE user_id = ?' : '';
    const userParams = isStudent ? [requestingUserId] : [];

    // By status
    const statusCounts: Record<string, number> = {
      pending: 0,
      'in-progress': 0,
      resolved: 0,
      closed: 0,
    };

    const statusRows = this.db
      .prepare(
        `SELECT status, COUNT(*) as count
         FROM complaints
         ${userFilter}
         GROUP BY status`
      )
      .all(...userParams) as any[];

    for (const r of statusRows) {
      statusCounts[r.status] = Number(r.count);
    }

    // By category
    const categoryCounts: Record<string, number> = {
      IT: 0,
      Facilities: 0,
      Academic: 0,
      'Exam Hall': 0,
      Safety: 0,
      Finance: 0,
      'Student Affairs': 0,
    };

    const categoryRows = this.db
      .prepare(
        `SELECT category, COUNT(*) as count
         FROM complaints
         ${userFilter}
         GROUP BY category`
      )
      .all(...userParams) as any[];

    for (const r of categoryRows) {
      categoryCounts[r.category] = Number(r.count);
    }

    // SLA breaches: status == 'pending' and age > 72 hours, OR sla_escalated == 1
    const threshold = new Date(Date.now() - SLA_DURATION_HOURS * 60 * 60 * 1000).toISOString();
    const slaFilter = isStudent
      ? 'WHERE user_id = ? AND ((status = ? AND created_at <= ?) OR sla_escalated = ?)'
      : 'WHERE (status = ? AND created_at <= ?) OR sla_escalated = ?';
    const slaParams = isStudent
      ? [requestingUserId, 'pending', threshold, 1]
      : ['pending', threshold, 1];

    const slaRow = this.db
      .prepare(`SELECT COUNT(*) as count FROM complaints ${slaFilter}`)
      .get(...slaParams) as any;
    const slaBreaches = Number(slaRow ? slaRow.count : 0);

    // Average resolution hours
    const avgFilter = isStudent
      ? "WHERE user_id = ? AND resolved_at IS NOT NULL AND status IN ('resolved', 'closed')"
      : "WHERE resolved_at IS NOT NULL AND status IN ('resolved', 'closed')";
    const avgParams = isStudent ? [requestingUserId] : [];

    const avgRow = this.db
      .prepare(
        `SELECT AVG((julianday(resolved_at) - julianday(created_at)) * 24.0) as avg_hours
         FROM complaints
         ${avgFilter}`
      )
      .get(...avgParams) as any;

    let averageResolutionHours = 0;
    if (avgRow && avgRow.avg_hours !== null && avgRow.avg_hours !== undefined) {
      averageResolutionHours = Math.round(Number(avgRow.avg_hours) * 100) / 100;
    }

    const pending = statusCounts['pending'] || 0;
    const inProgress = statusCounts['in-progress'] || 0;
    const resolved = statusCounts['resolved'] || 0;
    const closed = statusCounts['closed'] || 0;
    const total = pending + inProgress + resolved + closed;

    return {
      total_complaints: total,
      pending_complaints: pending,
      in_progress_complaints: inProgress,
      resolved_complaints: resolved,
      closed_complaints: closed,
      sla_breaches: slaBreaches,
      average_resolution_hours: averageResolutionHours,
      by_category: categoryCounts,
      by_status: statusCounts,
    };
  }
}
