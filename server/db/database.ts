import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists in workspace
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'simulator.db');
export const db = new Database(DB_PATH);

// Enable WAL mode for high concurrency and crash resilience
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  console.log(`[DB] Initializing database at ${DB_PATH}`);

  // Create Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Simulations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS simulations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      schema_version INTEGER DEFAULT 1,
      tags TEXT,
      data TEXT NOT NULL,
      step_count INTEGER DEFAULT 1,
      thumbnail TEXT,
      is_public INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_simulations_user_id ON simulations(user_id);
    CREATE INDEX IF NOT EXISTS idx_simulations_updated_at ON simulations(updated_at);
  `);

  // Create Simulation Backups table (ensures user data survives any upgrade)
  db.exec(`
    CREATE TABLE IF NOT EXISTS simulation_backups (
      id TEXT PRIMARY KEY,
      simulation_id TEXT NOT NULL,
      schema_version INTEGER NOT NULL,
      data TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (simulation_id) REFERENCES simulations(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_backups_sim_id ON simulation_backups(simulation_id);
  `);

  // Create Schema Migrations log
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('[DB] Database tables verified and ready.');
}
