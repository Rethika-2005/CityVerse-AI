import express from 'express';
import path from 'node:path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { db, initSchema, seedInitialData } from './server/db.ts';
import { runCentralCoordinationCycle } from './server/agents.ts';
import { generatePredictions } from './server/analytics.ts';
import { createApiRouter } from './server/routes.ts';

dotenv.config();

const PORT = 3000;

async function startServer() {
  initSchema();
  seedInitialData();

  const activityCount = db.prepare('SELECT COUNT(*) as cnt FROM agent_activities').get() as { cnt: number };
  if (activityCount.cnt === 0) {
    runCentralCoordinationCycle(db);
  }

  const predCount = db.prepare('SELECT COUNT(*) as cnt FROM predictions').get() as { cnt: number };
  if (predCount.cnt === 0) {
    generatePredictions(db);
  }

  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', createApiRouter(db));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CityVerse AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start CityVerse AI server:', err);
  process.exit(1);
});
