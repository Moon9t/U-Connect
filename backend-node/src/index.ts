import { getDatabase, closeDatabase } from './config/database';
import { runMigrations } from './db/schema';
import { seedDatabase } from './db/seeder';
import { createApp } from './app';
import { env } from './config/env';
import { ComplaintService } from './services/complaint.service';
import { NotificationService } from './services/notification.service';

async function bootstrap() {
  console.log('Starting U-Connect Node.js API Server...');

  // Initialize DB and migrations
  const db = getDatabase();
  runMigrations(db);

  // Check seeding condition
  const shouldSeed =
    process.env.SEED === 'true' ||
    process.argv.includes('--seed') ||
    (process.env.NODE_ENV !== 'production' &&
      Number((db.prepare('SELECT COUNT(*) as count FROM complaints').get() as any).count) === 0);

  if (shouldSeed) {
    await seedDatabase(db);
  }

  // Periodic SLA escalation checker (every 15 minutes)
  const notificationService = new NotificationService(db);
  const complaintService = new ComplaintService(db, notificationService);

  // Run once at startup
  try {
    const escalated = complaintService.processSLABreaches();
    if (escalated > 0) {
      console.log(`[SLA Engine] Escalated ${escalated} overdue complaints.`);
    }
  } catch (err) {
    console.error('[SLA Engine] Initial check error:', err);
  }

  const slaInterval = setInterval(() => {
    try {
      const count = complaintService.processSLABreaches();
      if (count > 0) {
        console.log(`[SLA Engine] Periodic check escalated ${count} complaints.`);
      }
    } catch (err) {
      console.error('[SLA Engine] Periodic check error:', err);
    }
  }, 15 * 60 * 1000);

  const app = createApp(db);
  const port = parseInt(env.PORT, 10) || 8080;

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`U-Connect Node.js API Server listening on port ${port}`);
    console.log(`Health check available at: http://localhost:${port}/health`);
    console.log(`API root available at: http://localhost:${port}/api`);
  });

  const shutdown = () => {
    console.log('\nShutting down gracefully...');
    clearInterval(slaInterval);
    server.close(() => {
      closeDatabase();
      console.log('Server and database connection closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
