import express from 'express';

// Builds the Express app without starting it.
// index.js calls listen(); tests (stage 7) import createApp() directly with Supertest.
export function createApp() {
  const app = express();

  app.use(express.json());

  // Health check: proves the API is up (used by the client shell and later by hosting).
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Any /api route that didn't match above.
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Central error handler: Express recognises it by the 4 arguments.
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.expose ? err.message : 'Internal server error' });
  });

  return app;
}
