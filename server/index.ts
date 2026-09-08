import express from 'express';
import path from 'path';
import fs from 'fs';
import { initDatabase } from './db/database';
import authRoutes from './routes/authRoutes';
import simulationRoutes from './routes/simulationRoutes';
import folderRoutes from './routes/folderRoutes';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const DIST_DIR = path.resolve(process.cwd(), 'dist');

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.path.startsWith('/api/health')) {
      console.log(`[HTTP] ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'DSA Animator Backend',
    version: '1.0.0',
    schemaVersion: 2,
    database: 'mysql',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/simulations', simulationRoutes);
app.use('/api/folders', folderRoutes);

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.status(404).send('Not found');
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message,
  });
});

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
    if (fs.existsSync(DIST_DIR)) {
      console.log('Serving UI from ./dist');
    }
  });
}

start();
