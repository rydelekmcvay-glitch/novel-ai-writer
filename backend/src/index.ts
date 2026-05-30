import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

import { settingsRouter } from './routes/settings';
import { projectsRouter } from './routes/projects';
import { knowledgeRouter } from './routes/knowledge';
import { chaptersRouter } from './routes/chapters';
import { generateRouter } from './routes/generate';
import { feedbackRouter } from './routes/feedback';
import { foreshadowingRouter } from './routes/foreshadowing';

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);

// In production, frontend and backend share the same origin — no CORS needed.
// In dev, allow Vite dev server.
if (!IS_PROD) {
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    })
  );
}

app.use(express.json({ limit: '10mb' }));

// API routes
app.use('/api/settings', settingsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/projects', knowledgeRouter);
app.use('/api/projects', chaptersRouter);
app.use('/api/generate', generateRouter);
app.use('/api/projects', feedbackRouter);
app.use('/api/projects', foreshadowingRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve compiled frontend static files (production)
const FRONTEND_DIST = IS_PROD
  ? path.resolve(process.cwd(), 'public')           // Docker / cloud: ./public
  : path.resolve(__dirname, '../../frontend/dist'); // local ts-node fallback

if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  // SPA fallback — all non-API routes return index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    const indexPath = path.join(FRONTEND_DIST, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      next();
    }
  });
}

// Global error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
);

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`\n🖊  Novel AI Writer`);
  console.log(`   本地访问:    http://localhost:${PORT}`);
  if (!IS_PROD) {
    console.log(`   开发前端:    http://localhost:5173`);
  }
  console.log(`   局域网访问:  http://<本机IP>:${PORT}\n`);
});
