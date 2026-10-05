import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { createSeededApp } from '../helpers/testDb';
import { Express } from 'express';
import { generateToken } from '../../src/utils/jwt';
import { UPLOAD_DIR } from '../../src/middleware/upload';

describe('Integration Tests: Attachments System', () => {
  let app: Express;
  let adminToken: string;
  let staffToken: string;
  let student1Token: string;
  let student2Token: string;

  beforeAll(async () => {
    const context = await createSeededApp();
    app = context.app;

    adminToken = generateToken({ user_id: 1, email: 'admin@test.com', role: 'admin' });
    staffToken = generateToken({ user_id: 5, email: 'staff1@uconnect.edu', role: 'staff' });
    student1Token = generateToken({ user_id: 11, email: 'student1@uconnect.edu', role: 'student' });
    student2Token = generateToken({ user_id: 12, email: 'student2@uconnect.edu', role: 'student' });
  });

  afterAll(() => {
    // Clean up test files created in uploads directory
    try {
      if (fs.existsSync(UPLOAD_DIR)) {
        const files = fs.readdirSync(UPLOAD_DIR);
        for (const file of files) {
          if (file.includes('test-') || file.endsWith('.txt') || file.endsWith('.pdf')) {
            fs.unlinkSync(path.join(UPLOAD_DIR, file));
          }
        }
      }
    } catch {
      // ignore
    }
  });

  describe('Complaint submission with file attachments', () => {
    it('should create complaint with attached file via multipart/form-data', async () => {
      const sampleContent = Buffer.from('Official incident report details');

      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${student1Token}`)
        .field('title', 'Lab Equipment Damage with photo')
        .field('description', 'Microscope in Lab 3 broken by power surge')
        .field('category', 'Facilities')
        .field('department_id', '2')
        .field('anonymous', 'false')
        .attach('files', sampleContent, 'incident_proof.pdf');

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.attachments).toBeDefined();
      expect(res.body.data.attachments.length).toBe(1);

      const att = res.body.data.attachments[0];
      expect(att.file_name).toBe('incident_proof.pdf');
      expect(att.file_size).toBe(sampleContent.length);
      expect(att.file_url).toContain(`/api/attachments/${att.id}`);

      // Verify complaint detail endpoint returns the attachment
      const detailRes = await request(app)
        .get(`/api/complaints/${res.body.data.id}`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.attachments.length).toBe(1);
      expect(detailRes.body.data.attachments[0].file_name).toBe('incident_proof.pdf');
    });

    it('should reject file upload exceeding 5MB limit', async () => {
      // Create a 6MB dummy buffer
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024);

      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${student1Token}`)
        .field('title', 'Oversized file upload test')
        .field('description', 'Testing upload size limits for security')
        .field('category', 'IT')
        .field('department_id', '1')
        .attach('files', largeBuffer, 'huge_file.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/5MB/i);
    });

    it('should reject disallowed file extensions', async () => {
      const scriptBuffer = Buffer.from('echo "malicious script"');

      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${student1Token}`)
        .field('title', 'Malicious file upload attempt')
        .field('description', 'Testing file filter security')
        .field('category', 'IT')
        .field('department_id', '1')
        .attach('files', scriptBuffer, 'script.exe');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/not supported/i);
    });
  });

  describe('Attachment download and access control', () => {
    let complaintId: number;
    let attachmentId: number;

    beforeAll(async () => {
      const content = Buffer.from('Student 1 confidential grievance proof');
      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${student1Token}`)
        .field('title', 'Confidential student grievance')
        .field('description', 'Personal issue requiring documentation')
        .field('category', 'Student Affairs')
        .field('department_id', '1')
        .attach('files', content, 'confidential_evidence.pdf');

      complaintId = res.body.data.id;
      attachmentId = res.body.data.attachments[0].id;
    });

    it('should allow complaint owner to download their attachment', async () => {
      const res = await request(app)
        .get(`/api/attachments/${attachmentId}?download=true`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('confidential_evidence.pdf');
      expect(res.body.toString()).toBe('Student 1 confidential grievance proof');
    });

    it('should allow download via query token for browser links', async () => {
      const res = await request(app)
        .get(`/api/attachments/${attachmentId}?token=${student1Token}&download=true`);

      expect(res.status).toBe(200);
      expect(res.body.toString()).toBe('Student 1 confidential grievance proof');
    });

    it('should forbid other students from downloading the attachment', async () => {
      const res = await request(app)
        .get(`/api/attachments/${attachmentId}`)
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(403);
    });

    it('should allow staff and admin to access the attachment', async () => {
      const staffRes = await request(app)
        .get(`/api/attachments/${attachmentId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(staffRes.status).toBe(200);

      const adminRes = await request(app)
        .get(`/api/attachments/${attachmentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminRes.status).toBe(200);
    });

    it('should allow uploading additional attachments to an existing complaint', async () => {
      const supplementaryContent = Buffer.from('Supplementary follow-up document');

      const res = await request(app)
        .post(`/api/complaints/${complaintId}/attachments`)
        .set('Authorization', `Bearer ${student1Token}`)
        .attach('files', supplementaryContent, 'follow_up.pdf');

      expect(res.status).toBe(201);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].file_name).toBe('follow_up.pdf');

      // Verify complaint now has 2 attachments
      const detailRes = await request(app)
        .get(`/api/complaints/${complaintId}`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(detailRes.body.data.attachments.length).toBe(2);
    });
  });
});
