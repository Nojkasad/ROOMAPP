import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { findMembership } from '../middleware/membership.js';
import { HttpError } from '../lib/httpError.js';
import { stationUrl, toQrSvg } from '../lib/qr.js';
import { findStationBySlug, getStationPage, advanceStation } from '../services/stations.js';

// Mounted at /api/stations in app.js. These routes use the QR slug instead of a household ID.
export const stationsRouter = Router();

stationsRouter.use(requireAuth);

// The tenant check for slug routes: find the station, then the same membership check as stage 4.
// Unknown slug and "not your household" give the same 404.
async function requireStationAccess(req, res, next) {
  const station = await findStationBySlug(req.params.slug);
  if (!station || !(await findMembership(req.user.id, station.householdId))) {
    throw new HttpError(404, 'Station not found');
  }
  req.station = station;
  next();
}

// What scanning the QR code opens: current state, next state, last 5 changes.
stationsRouter.get('/:slug', requireStationAccess, async (req, res) => {
  res.json({ station: await getStationPage(req.station) });
});

// "Next" button. Body: { version } - the version the client saw.
stationsRouter.post('/:slug/advance', requireStationAccess, async (req, res) => {
  res.json({ station: await advanceStation(req.user.id, req.station, req.body) });
});

// The QR image for printing. <img src="/api/stations/<slug>/qr"> works because the cookie is sent along.
stationsRouter.get('/:slug/qr', requireStationAccess, async (req, res) => {
  res.type('image/svg+xml').send(await toQrSvg(stationUrl(req.station.publicSlug)));
});
