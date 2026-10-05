import { DatabaseSync } from 'node:sqlite';
import { faker } from '@faker-js/faker';
import { hashPassword } from '../utils/password';
import { calculatePriority } from '../services/complaint.rules';
import { Category, Status } from '../models/types';

export async function seedDatabase(db: DatabaseSync): Promise<void> {
  console.log('Starting database seeding...');

  // 1. Seed Departments
  const depts = [
    {
      name: 'Information Technology Services',
      code: 'IT',
      description: 'Campus networking, software systems, computer labs, and portal access',
    },
    {
      name: 'Facilities & Campus Maintenance',
      code: 'FAC',
      description: 'Physical infrastructure, air conditioning, plumbing, and electricity',
    },
    {
      name: 'Academic Affairs & Registrar',
      code: 'ACAD',
      description: 'Course registration, timetables, lecturer feedback, and grading issues',
    },
    {
      name: 'Examinations Management Unit',
      code: 'EXAM',
      description: 'Exam hall facilities, examination schedules, seating, and invigilation',
    },
    {
      name: 'Campus Safety & Security',
      code: 'SAFE',
      description: 'Campus emergency response, safety hazards, physical security, and health',
    },
  ];

  const now = new Date().toISOString();

  for (const dept of depts) {
    const existing = db.prepare('SELECT id FROM departments WHERE code = ?').get(dept.code);
    if (!existing) {
      db.prepare(
        `INSERT INTO departments (name, code, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(dept.name, dept.code, dept.description, now, now);
    }
  }

  const deptRows = db.prepare('SELECT id, code FROM departments').all() as any[];
  const deptIds = deptRows.map((d) => Number(d.id));

  // 2. Seed Users
  const defaultPassword = 'password123';
  const hashedPassword = await hashPassword(defaultPassword);

  // 4 Admins
  const adminEmails = [
    'admin@test.com',
    'admin2@uconnect.edu',
    'admin3@uconnect.edu',
    'admin4@uconnect.edu',
  ];
  const adminNames = ['Admin', 'Sarah Jenkins', 'Michael Chang', 'Diana Ross'];

  for (let i = 0; i < adminEmails.length; i++) {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmails[i]);
    if (!existing) {
      db.prepare(
        `INSERT INTO users (name, email, password_hash, role, department_id, created_at, updated_at)
         VALUES (?, ?, ?, 'admin', ?, ?, ?)`
      ).run(adminNames[i], adminEmails[i], hashedPassword, deptIds[i % deptIds.length], now, now);
    }
  }

  // 6 Staff
  const staffNames = [
    'David Miller',
    'Emma Watson',
    'James Wilson',
    'Patricia Moore',
    'Robert Taylor',
    'Linda Anderson',
  ];

  for (let i = 0; i < staffNames.length; i++) {
    const email = `staff${i + 1}@uconnect.edu`;
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!existing) {
      db.prepare(
        `INSERT INTO users (name, email, password_hash, role, department_id, created_at, updated_at)
         VALUES (?, ?, ?, 'staff', ?, ?, ?)`
      ).run(staffNames[i], email, hashedPassword, deptIds[i % deptIds.length], now, now);
    }
  }

  // 10 Students
  const studentNames = [
    'Alex Turner',
    'Bethany Clark',
    'Carlos Gomez',
    'Daniela Vega',
    'Ethan Hunt',
    'Fiona Gallagher',
    'George Vance',
    'Hannah Abbott',
    'Ian Malcolm',
    'Julia Roberts',
  ];

  for (let i = 0; i < studentNames.length; i++) {
    const email = `student${i + 1}@uconnect.edu`;
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!existing) {
      db.prepare(
        `INSERT INTO users (name, email, password_hash, role, department_id, created_at, updated_at)
         VALUES (?, ?, ?, 'student', ?, ?, ?)`
      ).run(studentNames[i], email, hashedPassword, deptIds[i % deptIds.length], now, now);
    }
  }

  const studentRows = db.prepare("SELECT id FROM users WHERE role = 'student'").all() as any[];
  const studentIds = studentRows.map((s) => Number(s.id));

  // 3. Seed 520 Complaints
  const countRow = db.prepare('SELECT COUNT(*) as count FROM complaints').get() as any;
  const currentCount = Number(countRow.count);

  if (currentCount >= 520) {
    console.log(`Database already contains ${currentCount} complaints, skipping seed.`);
    return;
  }

  const needed = 520 - currentCount;
  const categories: Category[] = [
    'IT',
    'Facilities',
    'Academic',
    'Exam Hall',
    'Safety',
    'Finance',
    'Student Affairs',
  ];

  const statuses: Status[] = ['pending', 'in-progress', 'resolved', 'closed'];

  const insertStmt = db.prepare(
    `INSERT INTO complaints (
       title, description, category, priority, status, anonymous, sla_escalated,
       user_id, department_id, resolved_at, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const currentTime = Date.now();

  for (let i = 0; i < needed; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const studentId = studentIds[Math.floor(Math.random() * studentIds.length)];
    const deptId = deptIds[Math.floor(Math.random() * deptIds.length)];

    // Spread over last 120 days
    const daysAgo = Math.floor(Math.random() * 120);
    const hoursAgo = Math.floor(Math.random() * 24);
    let createdAtDate = new Date(currentTime - (daysAgo * 24 + hoursAgo) * 60 * 60 * 1000);

    // 1/3 anonymous
    const anonymous = i % 3 === 0 ? 1 : 0;

    let status = statuses[Math.floor(Math.random() * statuses.length)];

    // Force first 40 complaints to be SLA breached: pending & older than 75h
    if (i < 40) {
      status = 'pending';
      createdAtDate = new Date(currentTime - (75 + i * 2) * 60 * 60 * 1000);
    }

    let title = faker.hacker.phrase() || 'Campus facility maintenance request';
    if (title.length > 80) title = title.substring(0, 80);

    let description = faker.lorem.paragraph();
    if (i % 15 === 0) {
      description = `URGENT: Emergency situation observed in campus building. Immediate attention required: ${description}`;
    }

    // Apply Rule 1: Priority Auto-escalation
    const priority = calculatePriority(description, category);

    // Check SLA breach
    let slaEscalated = 0;
    const isBreached =
      status === 'pending' && currentTime - createdAtDate.getTime() > 72 * 60 * 60 * 1000;
    if (isBreached && i % 2 === 0) {
      slaEscalated = 1;
    }

    let resolvedAt: string | null = null;
    if (status === 'resolved' || status === 'closed') {
      const resHours = 2 + Math.floor(Math.random() * 46);
      const resTime = new Date(createdAtDate.getTime() + resHours * 60 * 60 * 1000);
      resolvedAt = resTime.getTime() > currentTime ? new Date(currentTime - 60000).toISOString() : resTime.toISOString();
    }

    const createdAtStr = createdAtDate.toISOString();

    insertStmt.run(
      title,
      description,
      category,
      priority,
      status,
      anonymous,
      slaEscalated,
      studentId,
      deptId,
      resolvedAt,
      createdAtStr,
      createdAtStr
    );
  }

  const finalCountRow = db.prepare('SELECT COUNT(*) as count FROM complaints').get() as any;
  console.log(`Database seeded successfully! Total complaints: ${finalCountRow.count} (>= 520 achieved)`);
}
