import request from 'supertest';
import { createSeededApp } from '../helpers/testDb';
import { Express } from 'express';

describe('System Tests: End-to-End Workflow & Dashboard', () => {
  let app: Express;

  beforeAll(async () => {
    const context = await createSeededApp();
    app = context.app;
  });

  it('should execute complete grievance lifecycle from submission to terminal closure', async () => {
    // 1. Student Login
    const studentLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student1@uconnect.edu', password: 'password123' });
    expect(studentLogin.status).toBe(200);
    const studentToken = studentLogin.body.data.token;
    const studentId = studentLogin.body.data.user.id;

    // 2. Student Submits Grievance
    const submitRes = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Projector burnt out in Lab 304',
        description: 'URGENT: projector blew smoke and stopped working',
        category: 'IT',
        department_id: 1,
      });

    expect(submitRes.status).toBe(201);
    expect(submitRes.body.data.priority).toBe('critical'); // Rule 1
    expect(submitRes.body.data.status).toBe('pending');
    const complaintId = submitRes.body.data.id;

    // 3. Staff Login
    const staffLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff1@uconnect.edu', password: 'password123' });
    expect(staffLogin.status).toBe(200);
    const staffToken = staffLogin.body.data.token;

    // 4. Staff Transitions to In-Progress
    const inProgressRes = await request(app)
      .put(`/api/complaints/${complaintId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'in-progress' });
    expect(inProgressRes.status).toBe(200);
    expect(inProgressRes.body.data.status).toBe('in-progress');

    // 5. Staff Adds Comment
    const commentRes = await request(app)
      .post(`/api/complaints/${complaintId}/comments`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ content: 'Technician dispatched to replace the bulb and ballast.' });
    expect(commentRes.status).toBe(201);
    expect(commentRes.body.data.content).toMatch(/Technician dispatched/);

    // 6. Verify Student Received Notification
    const notifRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(notifRes.status).toBe(200);
    expect(notifRes.body.data.length).toBeGreaterThan(0);

    // 7. Staff Resolves Complaint
    const resolveRes = await request(app)
      .put(`/api/complaints/${complaintId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'resolved' });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.status).toBe('resolved');
    expect(resolveRes.body.data.resolved_at).not.toBeNull();

    // 8. Staff Closes Complaint (Terminal State)
    const closeRes = await request(app)
      .put(`/api/complaints/${complaintId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'closed' });
    expect(closeRes.status).toBe(200);
    expect(closeRes.body.data.status).toBe('closed');

    // 9. Verify Terminal State: Cannot Transition Out of Closed
    const invalidReopen = await request(app)
      .put(`/api/complaints/${complaintId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'pending' });
    expect(invalidReopen.status).toBe(400);
    expect(invalidReopen.body.error).toMatch(/cannot transition/i);
  });

  it('should export complaints to CSV format for staff and admin', async () => {
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' });
    const token = adminLogin.body.data.token;

    const res = await request(app)
      .get('/api/complaints/export/csv')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain('ID,Title,Category,Priority,Status');
  });

  it('should export complaints to PDF format for staff and admin', async () => {
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' });
    const token = adminLogin.body.data.token;

    const res = await request(app)
      .get('/api/complaints/export/pdf')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename=complaints_report_.*\.pdf/);
    // PDF files start with %PDF magic header
    expect(res.body.toString('latin1', 0, 4)).toBe('%PDF');
    expect(res.body.length).toBeGreaterThan(1000);
  });

  it('should compute valid dashboard metrics and SLA counts', async () => {
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' });
    const token = adminLogin.body.data.token;

    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const stats = res.body.data;

    expect(stats.total_complaints).toBeGreaterThanOrEqual(520);
    expect(stats.sla_breaches).toBeGreaterThan(0);
    expect(typeof stats.average_resolution_hours).toBe('number');
    expect(stats.by_status.pending).toBeGreaterThan(0);
    expect(stats.by_category.IT).toBeGreaterThan(0);
  });
});
