import crypto from 'node:crypto';
import { prisma } from '../db.js';
import { HttpError } from '../lib/httpError.js';
import { stationUrl } from '../lib/qr.js';
import { publicUser } from './auth.js';

const isUniqueViolation = (err) => err?.code === 'P2002';

// Random, unguessable slug for the QR URL (/s/<slug>), e.g. "Xk3J9xQ2mPa".
// Unguessable so nobody can walk through /s/1, /s/2... Access is still checked by membership.
const generateSlug = () => crypto.randomBytes(8).toString('base64url');

// What the station's current state, next state and states look like in every response.
const STATION_INCLUDE = {
  currentState: { include: { nextState: true } },
  states: { orderBy: { order: 'asc' } },
};

function stationView(station) {
  return {
    id: station.id,
    name: station.name,
    icon: station.icon,
    slug: station.publicSlug,
    url: stationUrl(station.publicSlug),
    householdId: station.householdId,
    version: station.version, // the client sends this back when advancing (optimistic lock)
    currentState: { id: station.currentState.id, name: station.currentState.name },
    nextState: { id: station.currentState.nextState.id, name: station.currentState.nextState.name },
    states: station.states.map((s) => ({ id: s.id, name: s.name, order: s.order })),
  };
}

const EVENT_INCLUDE = { user: true, station: true, fromState: true, toState: true };

function eventView(e) {
  return {
    id: e.id,
    createdAt: e.createdAt,
    user: publicUser(e.user),
    station: { id: e.station.id, name: e.station.name, slug: e.station.publicSlug },
    from: e.fromState.name,
    to: e.toState.name,
  };
}

// Creates a station and its state cycle inside a transaction (tx). Also used by the seed.
// Order matters because Station and State point at each other:
//   1. station (no current state yet)
//   2. states (no next pointer yet)
//   3. link each state to the next one, last -> first closes the cycle
//   4. set the station's current state
export async function createStationWithCycle(tx, { householdId, name, icon, publicSlug, stateNames, currentIndex = 0 }) {
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

function validateStationInput(body) {
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (name.length < 1 || name.length > 50) throw new HttpError(400, 'Station name must be 1-50 characters');

  const stateNames = Array.isArray(body?.states)
    ? body.states.map((s) => (typeof s === 'string' ? s.trim() : '')).filter(Boolean)
    : [];
  if (stateNames.length < 2 || stateNames.length > 10) throw new HttpError(400, 'A station needs 2-10 states');
  if (stateNames.some((s) => s.length > 30)) throw new HttpError(400, 'State names must be at most 30 characters');

  const icon = typeof body?.icon === 'string' && body.icon.trim() ? body.icon.trim().slice(0, 30) : null;
  return { name, stateNames, icon };
}

// Create a station in a household (membership already checked by the route).
export async function createStation(householdId, body) {
  const { name, stateNames, icon } = validateStationInput(body);

  // A slug collision is practically impossible (2^64 options), but if it happens the unique rule
  // rejects it, the whole transaction rolls back and we try again with a new slug.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const id = await prisma.$transaction(async (tx) => {
        const { station } = await createStationWithCycle(tx, {
          householdId,
          name,
          icon,
          publicSlug: generateSlug(),
          stateNames,
        });
        return station.id;
      });
      return stationView(await prisma.station.findUnique({ where: { id }, include: STATION_INCLUDE }));
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }
  throw new Error('Could not generate a unique station slug');
}

export async function listStations(householdId) {
  const stations = await prisma.station.findMany({
    where: { householdId },
    orderBy: { id: 'asc' },
    include: STATION_INCLUDE,
  });
  return stations.map(stationView);
}

// Station by its QR slug, or null. The route checks membership afterwards.
export async function findStationBySlug(slug) {
  return prisma.station.findUnique({ where: { publicSlug: String(slug) }, include: STATION_INCLUDE });
}

// The scan page: the station + its last 5 changes.
export async function getStationPage(station) {
  const events = await prisma.event.findMany({
    where: { stationId: station.id, undone: false },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: EVENT_INCLUDE,
  });
  return { ...stationView(station), history: events.map(eventView) };
}

// Move the station one step forward in its cycle and record who did it.
//
// Optimistic lock: the client sends the version it saw. The UPDATE only matches if the version
// is still the same, and it adds 1. If two people press "Next" at the same time, the second
// UPDATE matches 0 rows -> 409, instead of the station silently skipping a state.
// The UPDATE and the event are in one transaction: either both are saved or neither.
export async function advanceStation(userId, station, body) {
  const version = Number(body?.version);
  if (!Number.isInteger(version)) throw new HttpError(400, 'version is required');
  if (version !== station.version) throw new HttpError(409, 'Station was already changed, refresh');

  const from = station.currentState;
  const to = from.nextState;

  await prisma.$transaction(async (tx) => {
    const updated = await tx.station.updateMany({
      where: { id: station.id, version },
      data: { currentStateId: to.id, version: { increment: 1 } },
    });
    if (updated.count === 0) throw new HttpError(409, 'Station was already changed, refresh');

    await tx.event.create({ data: { stationId: station.id, userId, fromStateId: from.id, toStateId: to.id } });
  });

  return getStationPage(await findStationBySlug(station.publicSlug));
}

// Household history: the last 20 changes across all its stations, in one query.
export async function listHouseholdEvents(householdId) {
  const events = await prisma.event.findMany({
    where: { station: { householdId }, undone: false },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: EVENT_INCLUDE,
  });
  return events.map(eventView);
}
