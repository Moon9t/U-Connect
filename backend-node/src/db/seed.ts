import { getDatabase } from '../config/database';
import { runMigrations } from './schema';
import { seedDatabase } from './seeder';

async function main() {
  const db = getDatabase();
  runMigrations(db);
  await seedDatabase(db);
  console.log('Seeding complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
