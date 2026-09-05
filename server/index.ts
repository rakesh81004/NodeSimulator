import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db/database';
import authRoutes from './routes/authRoutes';
import simulationRoutes from './routes/simulationRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Database and Tables
initDatabase();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));

// Generous body limit for complex simulation JSON and import/export payloads
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Request logging in development
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'DSA Animator Backend API',
    version: '1.0.0',
    schemaVersion: 2,
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/simulations', simulationRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 DSA Animator Server running on http://localhost:${PORT}`);
  console.log(`📊 Persistent Database active at ./data/simulator.db`);
});
