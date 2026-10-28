import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db, { isPostgres, getPool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// Ensure migrations tracking table exists
export async function initMigrationsTable() {
  if (isPostgres()) {
    const pool = getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        batch INTEGER NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } else {
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        batch INTEGER NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
}

// Get list of applied migrations
export async function getAppliedMigrations() {
  await initMigrationsTable();
  if (isPostgres()) {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM migrations ORDER BY id ASC');
    return res.rows;
  } else {
    return db.prepare('SELECT * FROM migrations ORDER BY id ASC').all();
  }
}

// Get current batch number
async function getCurrentBatch() {
  const applied = await getAppliedMigrations();
  if (applied.length === 0) return 1;
  const maxBatch = Math.max(...applied.map(m => m.batch));
  return maxBatch + 1;
}

// Run pending migrations up
export async function migrateUp() {
  await initMigrationsTable();
  const applied = await getAppliedMigrations();
  const appliedNames = new Set(applied.map(m => m.name));

  const suffix = isPostgres() ? '_postgres.sql' : '.sql';
  const allFiles = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => !f.includes('rollback'))
    .filter(f => isPostgres() ? f.endsWith('_postgres.sql') : (f.endsWith('.sql') && !f.endsWith('_postgres.sql')))
    .sort();

  const toApply = allFiles.filter(f => !appliedNames.has(f));

  if (toApply.length === 0) {
    console.log('✅ Database is already up to date. No pending migrations.');
    return { applied: [] };
  }

  const batch = await getCurrentBatch();
  const newlyApplied = [];

  for (const file of toApply) {
    console.log(`⏳ Applying migration: ${file}...`);
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    if (isPostgres()) {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO migrations (name, batch) VALUES ($1, $2)', [file, batch]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        client.release();
        throw new Error(`Failed to apply migration ${file}: ${err.message}`);
      }
      client.release();
    } else {
      db.exec('BEGIN IMMEDIATE TRANSACTION;');
      try {
        db.exec(sql);
        db.prepare('INSERT INTO migrations (name, batch) VALUES (?, ?)').run(file, batch);
        db.exec('COMMIT;');
      } catch (err) {
        db.exec('ROLLBACK;');
        throw new Error(`Failed to apply migration ${file}: ${err.message}`);
      }
    }

    console.log(`✨ Successfully applied: ${file}`);
    newlyApplied.push(file);
  }

  return { applied: newlyApplied, batch };
}

// Rollback latest batch of migrations down
export async function migrateDown() {
  await initMigrationsTable();
  const applied = await getAppliedMigrations();

  if (applied.length === 0) {
    console.log('⚠️ No migrations found to rollback.');
    return { rolledBack: [] };
  }

  const maxBatch = Math.max(...applied.map(m => m.batch));
  const toRollback = applied.filter(m => m.batch === maxBatch).reverse();

  console.log(`⏳ Rolling back batch ${maxBatch} (${toRollback.length} migrations)...`);
  const rolledBack = [];

  for (const migration of toRollback) {
    const numPrefix = migration.name.split('_')[0];
    const candidate1 = `${numPrefix}_rollback${isPostgres() ? '_postgres.sql' : '.sql'}`;
    const candidate2 = migration.name.replace('.sql', `_rollback${isPostgres() ? '_postgres.sql' : '.sql'}`);
    const candidate3 = migration.name.replace('_initial_schema', '_rollback');

    let rollbackFile = candidate1;
    if (!fs.existsSync(path.join(MIGRATIONS_DIR, candidate1))) {
      rollbackFile = fs.existsSync(path.join(MIGRATIONS_DIR, candidate2)) ? candidate2 : candidate3;
    }

    const rollbackPath = path.join(MIGRATIONS_DIR, rollbackFile);
    if (!fs.existsSync(rollbackPath)) {
      throw new Error(`Rollback script not found for ${migration.name} (looked for ${rollbackFile})`);
    }

    const sql = fs.readFileSync(rollbackPath, 'utf8');

    if (isPostgres()) {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('DELETE FROM migrations WHERE id = $1', [migration.id]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        client.release();
        throw new Error(`Failed to rollback ${migration.name}: ${err.message}`);
      }
      client.release();
    } else {
      db.exec('BEGIN IMMEDIATE TRANSACTION;');
      try {
        db.exec(sql);
        db.prepare('DELETE FROM migrations WHERE id = ?').run(migration.id);
        db.exec('COMMIT;');
      } catch (err) {
        db.exec('ROLLBACK;');
        throw new Error(`Failed to rollback ${migration.name}: ${err.message}`);
      }
    }

    console.log(`⏪ Rolled back: ${migration.name}`);
    rolledBack.push(migration.name);
  }

  return { rolledBack, batch: maxBatch };
}

// Migration status inspection
export async function migrationStatus() {
  await initMigrationsTable();
  const applied = await getAppliedMigrations();
  const appliedMap = new Map(applied.map(m => [m.name, m]));

  const allFiles = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => !f.includes('rollback'))
    .filter(f => isPostgres() ? f.endsWith('_postgres.sql') : (f.endsWith('.sql') && !f.endsWith('_postgres.sql')))
    .sort();

  return allFiles.map(file => ({
    file,
    applied: appliedMap.has(file),
    batch: appliedMap.has(file) ? appliedMap.get(file).batch : null,
    appliedAt: appliedMap.has(file) ? appliedMap.get(file).applied_at : null
  }));
}
