import { Router } from 'express';
import { registerUser, verifyCredentials, publicUser } from '../services/auth.js';
import { createSession, deleteSession } from '../services/sessions.js';
import { setSessionCookie, clearSessionCookie } from '../lib/sessionCookie.js';
import { requireAuth } from '../middleware/auth.js';

// Mounted at /api/auth in app.js.
// Express 5 passes errors thrown in async handlers to the error handler automatically,
// so there is no try/catch here: a thrown HttpError becomes the JSON error response.
export const authRouter = Router();

// Create an account and log in straight away.
authRouter.post('/register', async (req, res) => {
  const user = await registerUser(req.body);
  setSessionCookie(res, await createSession(user.id));
  res.status(201).json({ user: publicUser(user) });
});

// Log in with username + password.
authRouter.post('/login', async (req, res) => {
  const user = await verifyCredentials(req.body);
  if (req.sessionToken) await deleteSession(req.sessionToken); // replace an old login on this browser
  setSessionCookie(res, await createSession(user.id));
  res.json({ user: publicUser(user) });
});

// End this browser's login. Works even if already logged out, so the client can always call it.
authRouter.post('/logout', async (req, res) => {
  if (req.sessionToken) await deleteSession(req.sessionToken);
  clearSessionCookie(res);
  res.status(204).end();
});

// "Who am I?" The frontend calls this when it loads.
authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});
