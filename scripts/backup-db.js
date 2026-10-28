import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUPS_DIR = path.join(__dirname, '../server/backups');

if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

export function createDatabaseBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `toyverse_backup_${timestamp}.sqlite`;
  const backupFilePath = path.join(BACKUPS_DIR, backupFileName);

  console.log(`💾 Initiating atomic database backup to: ${backupFilePath}...`);
  try {
    db.exec('PRAGMA wal_checkpoint(PASSIVE);');
  } catch (e) {}
  db.exec(`VACUUM INTO '${backupFilePath}';`);

  const stats = fs.statSync(backupFilePath);
  console.log(`✅ Backup successfully created! File: ${backupFileName} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

  return {
    filename: backupFileName,
    path: backupFilePath,
    sizeBytes: stats.size,
    createdAt: new Date().toISOString()
  };
}

if (process.argv[1] && process.argv[1].endsWith('backup-db.js')) {
  try {
    createDatabaseBackup();
    process.exit(0);
  } catch (err) {
    console.error('❌ Backup failed:', err);
    process.exit(1);
  }
}
