import {
  calculatePriority,
  canTransition,
  isSLABreached,
  maskComplaintForRole,
  SLA_DURATION_MS,
} from '../../src/services/complaint.rules';
import { Complaint } from '../../src/models/types';

describe('Unit Tests: Business Rules & State Machine', () => {
  describe('Rule 1: Priority Auto-Escalation', () => {
    it('should assign critical priority when emergency keywords are present in description', () => {
      expect(calculatePriority('There is an urgent leak in the hall', 'Facilities')).toBe('critical');
      expect(calculatePriority('Immediate fire hazard in room 202', 'Academic')).toBe('critical');
      expect(calculatePriority('EMERGENCY: broken glass', 'IT')).toBe('critical');
      expect(calculatePriority('Severe danger observed', 'Finance')).toBe('critical');
      expect(calculatePriority('critical network outage', 'IT')).toBe('critical');
    });

    it('should assign high priority for Exam Hall and Safety categories without emergency words', () => {
      expect(calculatePriority('AC broken in examination venue', 'Exam Hall')).toBe('high');
      expect(calculatePriority('Dark hallway near parking lot', 'Safety')).toBe('high');
    });

    it('should assign medium priority for normal complaints', () => {
      expect(calculatePriority('Projector bulb is flickering', 'IT')).toBe('medium');
      expect(calculatePriority('Fee statement discrepancy', 'Finance')).toBe('medium');
    });
  });

  describe('Rule 2: Strict State Machine Transitions', () => {
    it('should allow valid transitions from pending', () => {
      expect(canTransition('pending', 'in-progress')).toBe(true);
      expect(canTransition('pending', 'resolved')).toBe(true);
      expect(canTransition('pending', 'closed')).toBe(true);
    });

    it('should allow valid transitions from in-progress', () => {
      expect(canTransition('in-progress', 'resolved')).toBe(true);
      expect(canTransition('in-progress', 'closed')).toBe(true);
      expect(canTransition('in-progress', 'pending')).toBe(true);
    });

    it('should allow valid transitions from resolved', () => {
      expect(canTransition('resolved', 'closed')).toBe(true);
      expect(canTransition('resolved', 'in-progress')).toBe(false);
      expect(canTransition('resolved', 'pending')).toBe(false);
    });

    it('should enforce closed as a terminal state', () => {
      expect(canTransition('closed', 'pending')).toBe(false);
      expect(canTransition('closed', 'in-progress')).toBe(false);
      expect(canTransition('closed', 'resolved')).toBe(false);
    });
  });

  describe('Rule 3: SLA Breach Monitoring', () => {
    it('should detect SLA breach when pending complaint is older than 72 hours', () => {
      const past75h = new Date(Date.now() - 75 * 60 * 60 * 1000).toISOString();
      expect(isSLABreached(past75h, 'pending')).toBe(true);
    });

    it('should not detect breach when pending complaint is less than 72 hours old', () => {
      const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      expect(isSLABreached(past24h, 'pending')).toBe(false);
    });

    it('should not flag non-pending complaints as SLA breached', () => {
      const past100h = new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString();
      expect(isSLABreached(past100h, 'resolved')).toBe(false);
      expect(isSLABreached(past100h, 'closed')).toBe(false);
    });
  });

  describe('Rule 4: Anonymous Student Masking', () => {
    const mockComplaint: Complaint = {
      id: 1,
      reference_number: 'UC-000001',
      title: 'Lab complaint',
      description: 'Broken mouse',
      category: 'IT',
      location: 'Room 101',
      priority: 'medium',
      status: 'pending',
      anonymous: true,
      sla_escalated: false,
      user_id: 42,
      department_id: 1,
      resolved_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: {
        id: 42,
        name: 'Secret Student',
        email: 'secret@uconnect.edu',
        role: 'student',
      },
    };

    it('should mask user identity for student and staff roles', () => {
      const maskedForStudent = maskComplaintForRole(mockComplaint, 'student');
      expect(maskedForStudent.user_id).toBe(0);
      expect(maskedForStudent.user).toBeNull();

      const maskedForStaff = maskComplaintForRole(mockComplaint, 'staff');
      expect(maskedForStaff.user_id).toBe(0);
      expect(maskedForStaff.user).toBeNull();
    });

    it('should reveal user identity for admin role', () => {
      const visibleForAdmin = maskComplaintForRole(mockComplaint, 'admin');
      expect(visibleForAdmin.user_id).toBe(42);
      expect(visibleForAdmin.user).toBeDefined();
      expect(visibleForAdmin.user?.email).toBe('secret@uconnect.edu');
    });
  });
});
