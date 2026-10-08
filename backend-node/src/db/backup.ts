import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { env } from '../config/env';

const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

function getDatabasePath(): string {
  return path.isAbsolute(env.DB_PATH)
    ? env.DB_PATH
    : path.resolve(process.cwd(), env.DB_PATH);
}

function getBackupDirectory(): string {
  return path.resolve(process.cwd(), 'backups');
}

function getBackupPath(): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-');

  return path.join(
    getBackupDirectory(),
    `uconnect-${timestamp}.db`
  );
}

export function backupDatabase(): string {
  const databasePath = getDatabasePath();
  const backupDirectory = getBackupDirectory();
  const backupPath = getBackupPath();

  fs.mkdirSync(backupDirectory, { recursive: true });

  const db = new DatabaseSync(databasePath);

  try {
    db.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`);

    console.log(
      `[Backup] Database backup created: ${backupPath}`
    );

    return backupPath;
  } finally {
    db.close();
  }
}

export function cleanupOldBackups(): void {
  const backupDirectory = getBackupDirectory();

  if (!fs.existsSync(backupDirectory)) {
    return;
  }

  const backups = fs
    .readdirSync(backupDirectory)
    .filter(
      (file) =>
        file.startsWith('uconnect-') &&
        file.endsWith('.db')
    )
    .map((file) => ({
      name: file,
      path: path.join(backupDirectory, file),
      time: fs.statSync(
        path.join(backupDirectory, file)
      ).mtimeMs,
    }))
    .sort((a, b) => b.time - a.time);

  for (const backup of backups.slice(1)) {
    fs.unlinkSync(backup.path);

    console.log(
      `[Backup] Removed old backup: ${backup.path}`
    );
  }
}

export function runDatabaseBackup(): void {
  try {
    backupDatabase();
    cleanupOldBackups();
  } catch (err) {
    console.error(
      '[Backup] Database backup failed:',
      err
    );
  }
}

export function startBackupScheduler(): NodeJS.Timeout {
  runDatabaseBackup();

  return setInterval(
    runDatabaseBackup,
    BACKUP_INTERVAL_MS
  );
}