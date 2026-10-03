import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { authenticate, requireRole } from '../middleware/auth.js';
import { ok } from '../utils/response.js';
import { reportRows, shape } from './complaints.js';

const router = Router();
router.use(authenticate, requireRole('admin', 'staff', 'student'));

router.get('/complaints', async (req, res) => {
  const rows = await reportRows(req);
  return ok(res, rows.map(shape));
});

router.get('/complaints/by-category', async (req, res) => {
  const rows = await reportRows(req);
  const grouped = new Map<string, number>();
  for (const row of rows) grouped.set(row.category, (grouped.get(row.category) || 0) + 1);
  return ok(res, [...grouped.entries()].map(([category, count]) => ({ category, count })));
});

router.get('/complaints/by-status', async (req, res) => {
  const rows = await reportRows(req);
  const grouped = new Map<string, number>();
  for (const row of rows) grouped.set(row.status, (grouped.get(row.status) || 0) + 1);
  return ok(res, [...grouped.entries()].map(([status, count]) => ({ status, count })));
});

router.get('/complaints/export/pdf', async (req, res) => {
  const rows = await reportRows(req);
  const doc = new PDFDocument({ margin: 40 });
  const filename = `complaint_report_${new Date().toISOString().slice(0, 10)}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  doc.fontSize(18).text('UConnect Complaint Report');
  doc.moveDown(0.5);
  doc.fontSize(9).text(`Generated: ${new Date().toLocaleString('en-GB')}`);
  if (req.query.from || req.query.to) {
    doc.text(`Date range: ${req.query.from || 'Start'} to ${req.query.to || 'End'}`);
  }
  doc.moveDown();
  doc.fontSize(10).text(`Total complaints: ${rows.length}`);
  doc.moveDown();

  for (const row of rows) {
    doc.fontSize(9).text(
      `${row.reference_number} | ${row.status} | ${row.category} | ${row.priority}`,
    );
    doc.fontSize(8).text(`${row.title} — ${row.department_name || 'Unassigned'}`);
    doc.moveDown(0.35);
  }

  doc.end();
});

export default router;
