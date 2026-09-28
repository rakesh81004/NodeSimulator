import mysql, { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { loadEnv } from './loadEnv';

loadEnv();

export type DbRow = RowDataPacket;

let pool: Pool | null = null;

// Netlify Functions run in AWS Lambda; either env var reliably indicates
// we're NOT on a developer's machine, where falling back to 127.0.0.1 (a
// database that obviously doesn't exist in that sandbox) would otherwise
// silently produce "connect ECONNREFUSED 127.0.0.1:4000" instead of a
// message that actually explains what's missing.
function isServerlessEnv() {
  return Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

function assertRequiredEnv() {
  if (!isServerlessEnv()) return;
  const required = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'JWT_SECRET'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s) on Netlify: ${missing.join(', ')}. ` +
      'Set them in Netlify (Site configuration -> Environment variables) and redeploy -- ' +
      'refusing to fall back to localhost defaults in production.'
    );
  }
}

function mysqlConfig() {
  assertRequiredEnv();

  return {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'node_simulator',
    // Managed MySQL hosts (PlanetScale, TiDB Cloud, Aiven, Railway, ...) require
    // TLS. Set MYSQL_SSL=true (and optionally MYSQL_SSL_REJECT_UNAUTHORIZED=false
    // for hosts using a cert your CA bundle doesn't recognize) in that env.
    ssl:
      process.env.MYSQL_SSL === 'true'
        ? { rejectUnauthorized: process.env.MYSQL_SSL_REJECT_UNAUTHORIZED !== 'false' }
        : undefined,
  };
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('MySQL pool is not ready. initDatabase() must run first.');
  }
  return pool;
}

export async function query<T extends RowDataPacket>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await getPool().execute<T[]>(sql, params);
  return rows;
}

export async function queryOne<T extends RowDataPacket>(sql: string, params: any[] = []): Promise<T | undefined> {
  const rows = await query<T>(sql, params);
  return rows[0];
}

export async function execute(sql: string, params: any[] = []): Promise<ResultSetHeader> {
  const [result] = await getPool().execute<ResultSetHeader>(sql, params);
  return result;
}

export async function withTransaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await getPool().getConnection();
  await conn.beginTransaction();
  try {
    const out = await fn(conn);
    await conn.commit();
    return out;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function initDatabase() {
  // Reuse an already-initialized pool across warm serverless invocations
  // instead of reconnecting (and re-running every CREATE TABLE) on each call.
  if (pool) return;

  const cfg = mysqlConfig();
  console.log(`[DB] Connecting to MySQL at ${cfg.host}:${cfg.port} (database: ${cfg.database})`);

  // Managed hosts (PlanetScale, TiDB Cloud, ...) commonly pre-provision the
  // database and don't grant the app user CREATE DATABASE -- skip trying if
  // that fails instead of crashing startup; the database presumably already
  // exists there.
  try {
    const admin = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      ssl: cfg.ssl,
      multipleStatements: true,
    });
    try {
      await admin.query(
        `CREATE DATABASE IF NOT EXISTS \`${cfg.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
    } finally {
      await admin.end();
    }
  } catch (err: any) {
    console.warn('[DB] Could not CREATE DATABASE (likely lacks privilege on a managed host) -- assuming it already exists.', err?.message || err);
  }

  pool = mysql.createPool({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    ssl: cfg.ssl,
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
    namedPlaceholders: false,
  });

  // If anything below fails (e.g. the host is unreachable), don't leave a
  // broken pool cached on the module -- a warm serverless invocation would
  // otherwise see `pool` already set and skip straight past initDatabase()'s
  // `if (pool) return`, silently treating a dead connection as "ready" and
  // only failing later, confusingly, inside an actual request handler.
  try {
    await runSchemaSetup();
  } catch (err) {
    pool = null;
    throw err;
  }
}

async function runSchemaSetup() {
  await execute(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS folders (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      name VARCHAR(255) NOT NULL,
      color VARCHAR(20) DEFAULT '#6366f1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_folders_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS simulations (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      schema_version INT DEFAULT 1,
      tags VARCHAR(255),
      data LONGTEXT NOT NULL,
      step_count INT DEFAULT 1,
      thumbnail LONGTEXT,
      is_public TINYINT DEFAULT 0,
      folder_id VARCHAR(64) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_simulations_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Older databases created before folders existed won't have this column yet.
  await alterIgnoreDuplicate(
    'ALTER TABLE simulations ADD COLUMN folder_id VARCHAR(64) NULL'
  );
  await alterIgnoreDuplicate(
    `ALTER TABLE simulations ADD CONSTRAINT fk_simulations_folder
       FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL`
  );

  await execute(`
    CREATE TABLE IF NOT EXISTS simulation_backups (
      id VARCHAR(64) PRIMARY KEY,
      simulation_id VARCHAR(64) NOT NULL,
      schema_version INT NOT NULL,
      data LONGTEXT NOT NULL,
      reason VARCHAR(255) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_backups_simulation
        FOREIGN KEY (simulation_id) REFERENCES simulations(id) ON DELETE CASCADE
    )
  `);

  // CREATE INDEX IF NOT EXISTS is not available on older MySQL — ignore "Duplicate key name"
  await createIndexIgnoreDuplicate(
    'CREATE INDEX idx_simulations_user_id ON simulations(user_id)'
  );
  await createIndexIgnoreDuplicate(
    'CREATE INDEX idx_simulations_updated_at ON simulations(updated_at)'
  );
  await createIndexIgnoreDuplicate(
    'CREATE INDEX idx_backups_sim_id ON simulation_backups(simulation_id)'
  );
  await createIndexIgnoreDuplicate(
    'CREATE INDEX idx_folders_user_id ON folders(user_id)'
  );
  await createIndexIgnoreDuplicate(
    'CREATE INDEX idx_simulations_folder_id ON simulations(folder_id)'
  );

  const ping = await queryOne<RowDataPacket>('SELECT 1 AS ok');
  if (!ping) {
    throw new Error('MySQL connected but ping failed.');
  }

  console.log('[DB] MySQL tables verified and ready.');
}

async function createIndexIgnoreDuplicate(sql: string) {
  try {
    await execute(sql);
  } catch (err: any) {
    if (err?.code !== 'ER_DUP_KEYNAME') throw err;
  }
}

async function alterIgnoreDuplicate(sql: string) {
  try {
    await execute(sql);
  } catch (err: any) {
    if (err?.code !== 'ER_DUP_FIELDNAME' && err?.code !== 'ER_DUP_KEYNAME' && err?.code !== 'ER_FK_DUP_NAME') {
      throw err;
    }
  }
}
