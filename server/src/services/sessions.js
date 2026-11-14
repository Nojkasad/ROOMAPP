import crypto from 'node:crypto';
import { prisma } from '../db.js';

const DAY_MS = 24 * 60 * 60 * 1000;
export const SESSION_DAYS = 90;
export const SESSION_MAX_AGE_MS = SESSION_DAYS * DAY_MS;

// The database stores only the hash. If someone steals a database backup,
// they get hashes, which can't be turned back into working cookie tokens.
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Creates a login for a user. Returns the raw token: it goes into the cookie and is never stored.
export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url'); // 256 random bits
  await prisma.session.create({
    data: { id: hashToken(token), userId, expiresAt: new Date(Date.now() + SESSION_MAX_AGE_MS) },
  });
  return token;
}

// Looks up the session for a cookie token.
// Returns { user, renewed } or null if the token is unknown or expired.
// Sliding expiry: if the session was last extended more than a day ago, push it 90 days forward,
// so someone who uses the app at least every 90 days never has to log in again.
export async function validateSession(token) {
  const id = hashToken(token);
  const session = await prisma.session.findUnique({ where: { id }, include: { user: true } });
  if (!session) return null;

  const now = Date.now();
  if (session.expiresAt.getTime() <= now) {
    await prisma.session.delete({ where: { id } }).catch(() => {});
    return null;
  }

  let renewed = false;
  if (session.expiresAt.getTime() - now < SESSION_MAX_AGE_MS - DAY_MS) {
    await prisma.session.update({ where: { id }, data: { expiresAt: new Date(now + SESSION_MAX_AGE_MS) } });
    renewed = true;
  }

  return { user: session.user, renewed };
}

// Ends one login. deleteMany doesn't throw if it's already gone.
export async function deleteSession(token) {
  await prisma.session.deleteMany({ where: { id: hashToken(token) } });
}
