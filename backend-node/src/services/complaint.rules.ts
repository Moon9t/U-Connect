import { Priority, Status, Role, Complaint } from '../models/types';

export const SLA_DURATION_HOURS = 72;
export const SLA_DURATION_MS = SLA_DURATION_HOURS * 60 * 60 * 1000;

/**
 * Rule 1: Priority Auto-Escalation
 * - If description contains any of: emergency, urgent, critical, immediate, danger -> critical
 * - If category is Exam Hall or Safety -> high
 * - Otherwise -> medium
 */
export function calculatePriority(description: string, category: string): Priority {
  const descLower = description.toLowerCase();
  const criticalKeywords = ['emergency', 'urgent', 'critical', 'immediate', 'danger'];

  for (const kw of criticalKeywords) {
    if (descLower.includes(kw)) {
      return 'critical';
    }
  }

  if (category === 'Exam Hall' || category === 'Safety') {
    return 'high';
  }

  return 'medium';
}

/**
 * Rule 2: Strict Transition State Machine
 * - pending     -> in-progress, resolved, closed
 * - in-progress -> resolved, closed, pending
 * - resolved    -> closed
 * - closed      -> terminal state (cannot transition anywhere)
 */
export function canTransition(currentStatus: Status, newStatus: Status): boolean {
  switch (currentStatus) {
    case 'pending':
      return newStatus === 'in-progress' || newStatus === 'resolved' || newStatus === 'closed';
    case 'in-progress':
      return newStatus === 'resolved' || newStatus === 'closed' || newStatus === 'pending';
    case 'resolved':
      return newStatus === 'closed';
    case 'closed':
      return false;
    default:
      return false;
  }
}

/**
 * Rule 3: SLA Breach Monitoring
 * SLA window is 72 hours. Breached if status == 'pending' and age > 72 hours.
 */
export function isSLABreached(createdAt: string | Date, status: Status): boolean {
  if (status !== 'pending') {
    return false;
  }
  const createdTime = new Date(createdAt).getTime();
  const now = Date.now();
  return now - createdTime > SLA_DURATION_MS;
}

/**
 * Rule 4: Anonymous Student Masking
 * If anonymous == true, strip user details and set user_id to 0 for non-admins.
 */
export function maskComplaintForRole(complaint: Complaint, role: Role): Complaint {
  if (!complaint.anonymous || role === 'admin') {
    return complaint;
  }

  return {
    ...complaint,
    user_id: 0,
    user: null,
  };
}
