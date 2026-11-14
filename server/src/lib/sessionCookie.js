import { SESSION_MAX_AGE_MS } from '../services/sessions.js';

export const SESSION_COOKIE = 'sid';

const cookieOptions = () => ({
  httpOnly: true, // JavaScript in the page can't read it (protects against XSS stealing the login)
  sameSite: 'lax', // not sent on cross-site POSTs (protects against CSRF), still sent when opening a QR link
  secure: process.env.NODE_ENV === 'production', // HTTPS only once hosted; localhost is plain HTTP
  path: '/',
});

export function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: SESSION_MAX_AGE_MS });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}
