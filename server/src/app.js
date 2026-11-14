import express from 'express';
import cookieParser from 'cookie-parser';
import { authenticate } from './middleware/auth.js';
import { authRouter } from './routes/auth.js';

// Builds the Express app without starting it.
// index.js calls listen(); tests (stage 7) import createApp() directly with Supertest.
export function createApp() {
  const app = express();

  // Middleware runs in this order for every request:
  app.use(express.json()); // 1. parse JSON bodies into req.body
  app.use(cookieParser()); // 2. parse the Cookie header into req.cookies
  app.use(authenticate); //   3. set req.user from the session cookie (or null)

  // Health check: proves the API is up (used by the client shell and later by hosting).
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.use('/api/auth', authRouter);

  // Any /api route that didn't match above.
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Central error handler: Express recognises it by the 4 arguments.
  // HttpError (and bad JSON from express.json) set expose = true, so their message is shown;
  // anything unexpected becomes a generic 500 and is logged on the server.
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: err.expose ? err.message : 'Internal server error' });
  });

  return app;
}
