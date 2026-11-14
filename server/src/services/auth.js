import bcrypt from 'bcrypt';
import { prisma } from '../db.js';
import { HttpError } from '../lib/httpError.js';

const BCRYPT_COST = 10;
const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

// Used when the username doesn't exist, so login takes about as long as with a real user.
// Otherwise the response time would reveal which usernames exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST);

// What the API returns about a user. passwordHash never leaves the server.
export const publicUser = (u) => ({ id: u.id, username: u.username, displayName: u.displayName });

const asString = (v) => (typeof v === 'string' ? v : '');

function validateRegistration(body) {
  const username = asString(body?.username).trim().toLowerCase();
  const displayName = asString(body?.displayName).trim();
  const password = asString(body?.password);

  if (!USERNAME_RE.test(username)) {
    throw new HttpError(400, 'Username must be 3-30 characters: lowercase letters, digits or _');
  }
  if (displayName.length < 1 || displayName.length > 50) {
    throw new HttpError(400, 'Display name must be 1-50 characters');
  }
  if (password.length < 8 || password.length > 72) {
    // bcrypt only uses the first 72 bytes, so longer passwords would be silently cut.
    throw new HttpError(400, 'Password must be 8-72 characters');
  }
  return { username, displayName, password };
}

export async function registerUser(body) {
  const { username, displayName, password } = validateRegistration(body);
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  try {
    return await prisma.user.create({ data: { username, displayName, passwordHash } });
  } catch (err) {
    // P2002 = unique constraint failed. Letting the database decide avoids a race
    // where two people register the same name at the same moment.
    if (err.code === 'P2002') throw new HttpError(409, 'Username is already taken');
    throw err;
  }
}

export async function verifyCredentials(body) {
  const username = asString(body?.username).trim().toLowerCase();
  const password = asString(body?.password);

  const user = username ? await prisma.user.findUnique({ where: { username } }) : null;
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  // Same message for "no such user" and "wrong password": don't reveal which usernames exist.
  if (!user || !ok) throw new HttpError(401, 'Wrong username or password');
  return user;
}
