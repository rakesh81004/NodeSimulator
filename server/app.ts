import express from 'express';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/authRoutes';
import simulationRoutes from './routes/simulationRoutes';
import folderRoutes from './routes/folderRoutes';

// The Express app itself, shared between the local dev server (server/index.ts,
// which also calls app.listen) and the Netlify Function wrapper (which hands
// requests to this same app without ever calling .listen).
export const app = express();
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

// Only relevant for the local/traditional server -- on Netlify, static files
// and the SPA fallback are served by Netlify itself (see netlify.toml), not
// by this Express app.
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
