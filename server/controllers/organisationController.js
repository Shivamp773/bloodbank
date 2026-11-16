import { User } from '../models/userModel.js';
import { PUBLIC_USER_FIELDS } from '../config/constants.js';

/** GET /api/v1/organisations: every organisation, for booking appointments and requesting blood. */
export async function listOrganisations(_req, res) {
  const organisations = await User.find({ role: 'organisation' })
    .select(PUBLIC_USER_FIELDS)
    .sort({ organisationName: 1 })
    .lean();
  res.json({ success: true, organisations });
}
