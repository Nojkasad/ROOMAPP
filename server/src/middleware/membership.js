import { prisma } from '../db.js';
import { HttpError } from '../lib/httpError.js';

// The tenant check, written once. Returns the user's membership in a household, or null.
// Stage 5 uses it for stations too: look up the station's householdId, then call this.
export async function findMembership(userId, householdId) {
  return prisma.membership.findUnique({ where: { userId_householdId: { userId, householdId } } });
}

// Put in front of every route with :householdId (after requireAuth).
// Not a member -> 404, the same answer as for a household that doesn't exist,
// so outsiders can't even find out which household IDs exist.
export async function requireMembership(req, res, next) {
  const householdId = Number(req.params.householdId);
  if (!Number.isInteger(householdId) || householdId <= 0) throw new HttpError(404, 'Household not found');

  const membership = await findMembership(req.user.id, householdId);
  if (!membership) throw new HttpError(404, 'Household not found');

  req.membership = membership; // routes read req.membership.householdId and req.membership.role
  next();
}

// Put after requireMembership when only certain roles may do something.
// 403 is fine here: the caller is a member, so they already know the household exists.
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.membership.role)) throw new HttpError(403, `Only ${roles.join(' or ')} can do this`);
    next();
  };
}
