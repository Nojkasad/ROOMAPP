import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getInvitePreview } from '../services/households.js';

// Mounted at /api/invites in app.js.
export const invitesRouter = Router();

// Preview for the /join/<code> page: "Join <name>? (n members)".
// Read-only on purpose: opening a link (or a messenger fetching a link preview) must never join anyone.
// Joining is the separate POST /api/households/join.
invitesRouter.get('/:code', requireAuth, async (req, res) => {
  res.json({ invite: await getInvitePreview(req.user.id, req.params.code) });
});
