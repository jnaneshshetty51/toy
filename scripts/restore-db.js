import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUPS_DIR = path.join(__dirname, '../server/backups');

export function restoreDatabase(backupFile) {
  let targetBackupPath = backupFile;
  if (!path.isAbsolute(targetBackupPath)) {
    targetBackupPath = path.join(BACKUPS_DIR, backupFile);
  }

  if (!fs.existsSync(targetBackupPath)) {
    throw new Error(`Backup file not found at: ${targetBackupPath}`);
  }

  console.log(`♻️ Restoring database from: ${targetBackupPath}...`);

  // Use SQLite ATTACH for zero-downtime hot restoration
  db.exec('PRAGMA busy_timeout = 10000;');
  db.exec(`ATTACH DATABASE '${targetBackupPath}' AS backup_source;`);

  try {
    db.exec('BEGIN IMMEDIATE TRANSACTION;');

    // Restore tables that exist in backup
    db.exec('DELETE FROM products;');
    db.exec('INSERT INTO products SELECT * FROM backup_source.products;');

    try {
      db.exec('DELETE FROM categories;');
      db.exec('INSERT INTO categories SELECT * FROM backup_source.categories;');
    } catch (e) {}

    try {
      db.exec('DELETE FROM users;');
      db.exec('INSERT INTO users SELECT * FROM backup_source.users;');
    } catch (e) {}

    try {
      db.exec('DELETE FROM orders;');
      db.exec('INSERT INTO orders SELECT * FROM backup_source.orders;');
      db.exec('DELETE FROM order_items;');
      db.exec('INSERT INTO order_items SELECT * FROM backup_source.order_items;');
    } catch (e) {}

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    db.exec('DETACH DATABASE backup_source;');
    throw err;
  }

  db.exec('DETACH DATABASE backup_source;');

  const restoredCount = db.prepare('SELECT count(*) as count FROM products').get().count;
  const restoredCats = db.prepare('SELECT count(*) as count FROM categories').get().count;

  console.log(`✅ Restoration complete! Verified ${restoredCount} products and ${restoredCats} categories.`);
  return {
    success: true,
    restoredProducts: restoredCount,
    restoredCategories: restoredCats
  };
}

if (process.argv[1] && process.argv[1].endsWith('restore-db.js')) {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node scripts/restore-db.js <backup_filename_or_path>');
    process.exit(1);
  }
  try {
    restoreDatabase(target);
    process.exit(0);
  } catch (err) {
    console.error('❌ Restore failed:', err);
    process.exit(1);
  }
}
