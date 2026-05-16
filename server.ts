import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes    from './server/routes/auth.js';
import networkRoutes from './server/routes/network.js';
import logsRoutes    from './server/routes/logs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT      = parseInt(process.env.PORT ?? '3000', 10);
const isDev     = process.env.NODE_ENV !== 'production';

async function startServer() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: isDev ? false : undefined,
    })
  );

  app.use(
    cors({
      origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
      credentials: true,
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // API routes
  app.use('/api/auth',    authRoutes);
  app.use('/api/network', networkRoutes);
  app.use('/api/logs',    logsRoutes);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Global error handler — keeps server alive on DB/Ryu errors
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const code = err.code ?? '';
    if (code === 'P1001' || code === 'P1002') {
      res.status(503).json({ error: 'Database unreachable — check your Supabase project is not paused' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  });

  // Frontend serving
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Apex SDN server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
