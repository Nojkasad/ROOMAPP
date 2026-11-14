// Demo data for development and the presentation.
// Run with: npm run db:seed   (safe to run again: it replaces only the demo data)
import bcrypt from 'bcrypt';
import { prisma } from '../src/db.js';

const DEMO_PASSWORD = 'demo1234';
const DEMO_USERS = [
  { username: 'tomas', displayName: 'Tomas' },
  { username: 'ieva', displayName: 'Ieva' },
];
const DEMO_INVITE_CODE = 'DEMO2026';

const minutesAgo = (m) => new Date(Date.now() - m * 60_000);

// Creates a station and its state cycle inside a transaction.
// Order matters because Station and State point at each other:
//   1. station (no current state yet)
//   2. states (no next pointer yet)
//   3. link each state to the next one, last -> first closes the cycle
//   4. set the station's current state
async function createStationWithCycle(tx, { householdId, name, icon, publicSlug, stateNames, currentIndex = 0 }) {
  const station = await tx.station.create({ data: { householdId, name, icon, publicSlug } });

  const states = [];
  for (const [i, stateName] of stateNames.entries()) {
    states.push(await tx.state.create({ data: { stationId: station.id, name: stateName, order: i + 1 } }));
  }

  for (const [i, state] of states.entries()) {
    const next = states[(i + 1) % states.length]; // % wraps the last one back to index 0
    await tx.state.update({ where: { id: state.id }, data: { nextStateId: next.id } });
  }

  await tx.station.update({ where: { id: station.id }, data: { currentStateId: states[currentIndex].id } });

  return { station, states };
}

// Records a state change the same way the app will: an event + station moves on + version + 1.
async function advance(tx, { station, from, to, user, at }) {
  await tx.event.create({
    data: { stationId: station.id, userId: user.id, fromStateId: from.id, toStateId: to.id, createdAt: at },
  });
  await tx.station.update({
    where: { id: station.id },
    data: { currentStateId: to.id, version: { increment: 1 } },
  });
}

async function main() {
  // Hash once outside the transaction: bcrypt is deliberately slow.
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await prisma.$transaction(async (tx) => {
    // Remove previous demo data only. Cascades delete memberships, stations, states and events.
    await tx.household.deleteMany({ where: { inviteCode: DEMO_INVITE_CODE } });
    await tx.user.deleteMany({ where: { username: { in: DEMO_USERS.map((u) => u.username) } } });

    const [tomas, ieva] = await Promise.all(
      DEMO_USERS.map((u) => tx.user.create({ data: { ...u, passwordHash } })),
    );

    const household = await tx.household.create({
      data: {
        name: 'Demo namai',
        inviteCode: DEMO_INVITE_CODE,
        memberships: {
          create: [
            { userId: tomas.id, role: 'OWNER' },
            { userId: ieva.id, role: 'MEMBER' },
          ],
        },
      },
    });

    // Washing machine: Įkrauta -> Skalbia -> Iškrauta -> back to Įkrauta
    const washer = await createStationWithCycle(tx, {
      householdId: household.id,
      name: 'Skalbimo mašina',
      icon: 'washing-machine',
      publicSlug: 'demo-skalbykle',
      stateNames: ['Įkrauta', 'Skalbia', 'Iškrauta'],
    });
    const [loaded, running, unloaded] = washer.states;
    await advance(tx, { station: washer.station, from: loaded, to: running, user: tomas, at: minutesAgo(150) });
    await advance(tx, { station: washer.station, from: running, to: unloaded, user: ieva, at: minutesAgo(60) });

    // Dishwasher: Nešvarūs -> Plauna -> Švarūs -> Iškrauti -> back to Nešvarūs
    const dishwasher = await createStationWithCycle(tx, {
      householdId: household.id,
      name: 'Indaplovė',
      icon: 'dishwasher',
      publicSlug: 'demo-indaplove',
      stateNames: ['Nešvarūs', 'Plauna', 'Švarūs', 'Iškrauti'],
    });
    const [dirty, washing] = dishwasher.states;
    await advance(tx, { station: dishwasher.station, from: dirty, to: washing, user: ieva, at: minutesAgo(20) });
  });

  console.log('Seed done.');
  console.log(`  Users: ${DEMO_USERS.map((u) => u.username).join(', ')} (password: ${DEMO_PASSWORD})`);
  console.log(`  Household invite code: ${DEMO_INVITE_CODE}`);
  console.log('  Station pages: /s/demo-skalbykle, /s/demo-indaplove');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
