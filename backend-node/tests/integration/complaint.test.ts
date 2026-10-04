import request from 'supertest';
import { createSeededApp } from '../helpers/testDb';
import { Express } from 'express';
import { generateToken } from '../../src/utils/jwt';

describe('Integration Tests: Complaints System', () => {
  let app: Express;
  let adminToken: string;
  let staffToken: string;
  let studentToken: string;

  beforeAll(async () => {
    const context = await createSeededApp();
    app = context.app;

    adminToken = generateToken({ user_id: 1, email: 'admin@test.com', role: 'admin' });
    staffToken = generateToken({ user_id: 5, email: 'staff1@uconnect.edu', role: 'staff' });
    studentToken = generateToken({ user_id: 11, email: 'student1@uconnect.edu', role: 'student' });
  });

  describe('GET /api/complaints', () => {
    it('should list complaints with pagination metadata for admin', async () => {
      const res = await request(app)
        .get('/api/complaints?page=1&page_size=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(10);
      expect(res.body.total).toBeGreaterThanOrEqual(520);
      expect(res.body.page).toBe(1);
      expect(res.body.page_size).toBe(10);
    });

    it('should filter complaints by status', async () => {
      const res = await request(app)
        .get('/api/complaints?status=pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      for (const item of res.body.data) {
        expect(item.status).toBe('pending');
      }
    });

    it('should search complaints by keyword across title and description', async () => {
      await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'SpecialUniqueSearchTerm network outage',
          description: 'The server in block B is down completely',
          category: 'IT',
          department_id: 1,
        });

      const res = await request(app)
        .get('/api/complaints?search=SpecialUniqueSearchTerm')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBeGreaterThan(0);
      for (const item of res.body.data) {
        const combined = `${item.title} ${item.description} ${item.category} ${item.user?.name || ''} ${item.department?.name || ''}`.toLowerCase();
        expect(combined.includes('specialuniquesearchterm')).toBe(true);
      }
    });

    it('should mask anonymous complaint user details when viewed by student', async () => {
      // Find or create an anonymous complaint
      const createRes = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Anonymous noise complaint',
          description: 'Loud party in residence hall',
          category: 'Facilities',
          department_id: 2,
          anonymous: true,
        });

      const anonId = createRes.body.data.id;

      // Staff views it
      const staffView = await request(app)
        .get(`/api/complaints/${anonId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(staffView.status).toBe(200);
      expect(staffView.body.data.anonymous).toBe(true);
      expect(staffView.body.data.user_id).toBe(0);
      expect(staffView.body.data.user).toBeNull();

      // Admin views it
      const adminView = await request(app)
        .get(`/api/complaints/${anonId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminView.status).toBe(200);
      expect(adminView.body.data.anonymous).toBe(true);
      expect(adminView.body.data.user_id).toBe(11);
      expect(adminView.body.data.user).toBeDefined();
    });
  });

  describe('POST /api/complaints & Auto-escalation', () => {
    it('should automatically escalate priority to critical when emergency keyword is present', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Immediate chemical leak',
          description: 'Urgent danger observed in lab corridor',
          category: 'Facilities',
          department_id: 2,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.priority).toBe('critical');
    });

    it('should automatically escalate priority to high for Exam Hall category', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Desk broken in exam hall',
          description: 'Row 4 seat 12 desk is collapsed',
          category: 'Exam Hall',
          department_id: 4,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.priority).toBe('high');
    });
  });

  describe('PUT /api/complaints/:id/status (RBAC & State Machine)', () => {
    it('should forbid student from updating complaint status', async () => {
      const res = await request(app)
        .put('/api/complaints/1/status')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ status: 'resolved' });

      expect(res.status).toBe(403);
    });

    it('should allow staff to transition pending to in-progress', async () => {
      // Create a fresh pending complaint
      const created = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Wi-Fi problem in library',
          description: 'Connection drops repeatedly',
          category: 'IT',
          department_id: 1,
        });

      const id = created.body.data.id;

      const res = await request(app)
        .put(`/api/complaints/${id}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'in-progress' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('in-progress');
    });
  });
});
