import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from '../../src/db/schema';
import { seedDatabase } from '../../src/db/seeder';
import { createApp } from '../../src/app';
import { Express } from 'express';

export function createTestDatabase(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  runMigrations(db);
  return db;
}

export async function createSeededApp(): Promise<{ app: Express; db: DatabaseSync }> {
  const db = createTestDatabase();
  await seedDatabase(db);
  const app = createApp(db);
  return { app, db };
}
