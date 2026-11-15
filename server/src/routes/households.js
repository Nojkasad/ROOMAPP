import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireMembership, requireRole } from '../middleware/membership.js';
import {
  createHousehold,
  listHouseholds,
  joinHousehold,
  getHouseholdDetails,
  regenerateInviteCode,
} from '../services/households.js';

// Mounted at /api/households in app.js.
export const householdsRouter = Router();

// Every household route needs a logged-in user.
householdsRouter.use(requireAuth);

// My households (only the ones I'm a member of).
householdsRouter.get('/', async (req, res) => {
  res.json({ households: await listHouseholds(req.user.id) });
});

// Create a household; I become OWNER.
householdsRouter.post('/', async (req, res) => {
  res.status(201).json({ household: await createHousehold(req.user.id, req.body) });
});

// Join with an invite code.
householdsRouter.post('/join', async (req, res) => {
  res.json({ household: await joinHousehold(req.user.id, req.body) });
});

// One household: members + invite code. requireMembership = the tenant check.
householdsRouter.get('/:householdId', requireMembership, async (req, res) => {
  res.json({ household: await getHouseholdDetails(req.membership.householdId, req.membership.role) });
});

// New invite code; old codes and QR photos stop working. OWNER only.
householdsRouter.post('/:householdId/invite-code', requireMembership, requireRole('OWNER'), async (req, res) => {
  res.json(await regenerateInviteCode(req.membership.householdId));
});
