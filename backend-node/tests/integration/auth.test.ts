import request from 'supertest';
import { createSeededApp } from '../helpers/testDb';
import { Express } from 'express';
import { DatabaseSync } from 'node:sqlite';

describe('Integration Tests: Auth Endpoints', () => {
  let app: Express;
  let db: DatabaseSync;

  beforeAll(async () => {
    const context = await createSeededApp();
    app = context.app;
    db = context.db;
  });

  describe('POST /api/auth/register', () => {
    it('should successfully register a new student user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane.doe@uconnect.edu',
          password: 'password123',
          role: 'student',
        });

      expect(res.status).toBe(201);
      expect(res.body.error).toBeNull();
      expect(res.body.data.user.email).toBe('jane.doe@uconnect.edu');
      expect(res.body.data.token).toBeDefined();
    });

    it('should reject registration when email already exists', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate Admin',
          email: 'admin@test.com',
          password: 'password123',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already registered/i);
    });

    it('should reject invalid role specification', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Hacker',
          email: 'hacker@test.com',
          password: 'password123',
          role: 'supergod',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid role/i);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should successfully log in with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('admin');
    });

    it('should return 401 when password is wrong', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'wrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid email or password/i);
    });

    it('should return 401 when email does not exist', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'ghost@uconnect.edu',
          password: 'password123',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid email or password/i);
    });
  });

  describe('Admin User Management (Create & Deactivate)', () => {
    let adminToken: string;
    let createdUserId: number;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'password123' });
      adminToken = loginRes.body.data.token;
    });

    it('should allow admin to create a new user', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Deactivate Target',
          email: 'target@uconnect.edu',
          role: 'student',
          department_id: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.email).toBe('target@uconnect.edu');
      expect(res.body.data.is_active).toBe(true);
      createdUserId = res.body.data.id;
    });

    it('should allow newly created user to log in', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'target@uconnect.edu', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('target@uconnect.edu');
    });

    it('should allow admin to deactivate user', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${createdUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ is_active: false });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toMatch(/deactivated/i);
    });

    it('should reject login for deactivated user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'target@uconnect.edu', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/deactivated/i);
    });

    it('should prevent deactivation of root admin account', async () => {
      const res = await request(app)
        .put('/api/admin/users/1/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ is_active: false });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Cannot deactivate the root system administrator/i);
    });
  });
});
