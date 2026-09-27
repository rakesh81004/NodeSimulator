import { app } from './app';
import { initDatabase } from './db/database';

const PORT = Number(process.env.PORT) || 3001;

async function start() {
  try {
    await initDatabase();
  } catch (err: any) {
    console.error('[DB] Could not connect to MySQL.');
    console.error(err?.message || err);
    console.error('Create a .env file from .env.example and start MySQL on this PC. See README.');
    process.exit(1);
  }

  app.listen(PORT, () => {
    const host = process.env.MYSQL_HOST || '127.0.0.1';
    const dbName = process.env.MYSQL_DATABASE || 'node_simulator';
    console.log(`Node backend running on http://localhost:${PORT}`);
    console.log(`MySQL: ${host}/${dbName}`);
  });
}

start();
