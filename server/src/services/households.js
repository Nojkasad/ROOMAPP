import { prisma } from '../db.js';
import { HttpError } from '../lib/httpError.js';
import { generateInviteCode, normalizeInviteCode } from '../lib/inviteCode.js';
import { publicUser } from './auth.js';

const isUniqueViolation = (err) => err?.code === 'P2002';

function validateName(body) {
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (name.length < 1 || name.length > 50) throw new HttpError(400, 'Household name must be 1-50 characters');
  return name;
}

// Runs fn(code) with a fresh invite code. In the extremely rare case the code already exists,
// the unique rule in the database rejects it and we simply try another one.
async function withUniqueInviteCode(fn) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await fn(generateInviteCode());
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }
  throw new Error('Could not generate a unique invite code');
}

// Create a household; the creator becomes its OWNER.
// The nested create saves the household and the membership in one statement, so a household
// can never exist without an owner.
export async function createHousehold(userId, body) {
  const name = validateName(body);
  const household = await withUniqueInviteCode((inviteCode) =>
    prisma.household.create({
      data: { name, inviteCode, memberships: { create: { userId, role: 'OWNER' } } },
    }),
  );
  return { id: household.id, name: household.name, inviteCode: household.inviteCode, role: 'OWNER', memberCount: 1 };
}

// Only the caller's households: the query starts from Membership, so it can't return anyone else's.
export async function listHouseholds(userId) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    orderBy: { joinedAt: 'asc' },
    include: { household: { include: { _count: { select: { memberships: true } } } } },
  });
  return memberships.map((m) => ({
    id: m.household.id,
    name: m.household.name,
    role: m.role,
    memberCount: m.household._count.memberships,
  }));
}

async function findByInviteCode(input) {
  const inviteCode = normalizeInviteCode(input);
  const household = inviteCode
    ? await prisma.household.findUnique({
        where: { inviteCode },
        include: { _count: { select: { memberships: true } } },
      })
    : null;
  if (!household) throw new HttpError(404, 'Invite code not found');
  return household;
}

// For the "Join <name>?" confirmation page. Shows only the name and member count.
export async function getInvitePreview(userId, code) {
  const household = await findByInviteCode(code);
  const membership = await prisma.membership.findUnique({
    where: { userId_householdId: { userId, householdId: household.id } },
  });
  return { name: household.name, memberCount: household._count.memberships, alreadyMember: !!membership };
}

// Join with an invite code as MEMBER.
export async function joinHousehold(userId, body) {
  const household = await findByInviteCode(body?.inviteCode);
  try {
    await prisma.membership.create({ data: { userId, householdId: household.id, role: 'MEMBER' } });
  } catch (err) {
    // The composite primary key (userId, householdId) makes a second membership impossible.
    if (isUniqueViolation(err)) throw new HttpError(409, 'You are already a member of this household');
    throw err;
  }
  return { id: household.id, name: household.name, role: 'MEMBER', memberCount: household._count.memberships + 1 };
}

// Full details for a member: invite code and member list. The caller is already checked by requireMembership.
export async function getHouseholdDetails(householdId, myRole) {
  const household = await prisma.household.findUnique({
    where: { id: householdId },
    include: { memberships: { include: { user: true }, orderBy: { joinedAt: 'asc' } } },
  });
  return {
    id: household.id,
    name: household.name,
    inviteCode: household.inviteCode,
    role: myRole,
    members: household.memberships.map((m) => ({ ...publicUser(m.user), role: m.role, joinedAt: m.joinedAt })),
  };
}

// Owner only (checked in the route): replace the code, so old codes and QR photos stop working.
export async function regenerateInviteCode(householdId) {
  const household = await withUniqueInviteCode((inviteCode) =>
    prisma.household.update({ where: { id: householdId }, data: { inviteCode } }),
  );
  return { inviteCode: household.inviteCode };
}
