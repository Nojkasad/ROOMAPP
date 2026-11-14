import { validateSession } from '../services/sessions.js';
import { SESSION_COOKIE, setSessionCookie, clearSessionCookie } from '../lib/sessionCookie.js';
import { HttpError } from '../lib/httpError.js';

// Runs on every request. Works out who is calling (if anyone) and puts it on req.user.
// It never rejects a request: not being logged in is a normal state here.
export async function authenticate(req, res, next) {
  req.user = null;
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return next();

  const result = await validateSession(token);
  if (!result) {
    clearSessionCookie(res); // unknown or expired token: tell the browser to forget it
    return next();
  }

  req.user = result.user;
  req.sessionToken = token;
  if (result.renewed) setSessionCookie(res, token); // sliding expiry: browser keeps it 90 more days
  next();
}

// Put in front of routes that need a logged-in user. Stops the request with 401 otherwise.
export function requireAuth(req, res, next) {
  if (!req.user) throw new HttpError(401, 'Not logged in');
  next();
}
