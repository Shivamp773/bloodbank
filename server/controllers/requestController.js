import { BloodRequest } from '../models/requestModel.js';
import { User } from '../models/userModel.js';
import { PUBLIC_USER_FIELDS, REQUEST_STATUSES } from '../config/constants.js';
import { getStockSummary, issueBlood } from '../services/stockService.js';
import { ApiError } from '../utils/ApiError.js';
import { displayName } from '../utils/helpers.js';
import {
  createRequestSchema,
  idParams,
  parse,
  rejectRequestSchema,
  requestListQuery,
} from '../validation/schemas.js';

const scopeFor = (user) => (user.role === 'hospital' ? { hospital: user._id } : { organisation: user._id });

// Works on both queries and documents (a document's populate() returns a promise, so it can't be chained).
const populateParties = (target) =>
  target.populate([
    { path: 'hospital', select: PUBLIC_USER_FIELDS },
    { path: 'organisation', select: PUBLIC_USER_FIELDS },
  ]);

/**
 * Moves a request from `pending` to another status in one atomic update, so two people acting on
 * the same request at once can't both succeed. Throws 404/409 with a helpful message otherwise.
 */
async function transitionFromPending(id, scope, update) {
  const updated = await BloodRequest.findOneAndUpdate(
    { _id: id, ...scope, status: 'pending' },
    { $set: update },
    { returnDocument: 'after' },
  );
  if (updated) return updated;

  const existing = await BloodRequest.findOne({ _id: id, ...scope }).select('status').lean();
  if (!existing) throw new ApiError(404, 'Request not found');
  throw new ApiError(409, `This request is already ${existing.status}`);
}

/** POST /api/v1/requests (hospital): ask an organisation for blood. */
export async function createRequest(req, res) {
  const data = parse(createRequestSchema, req.body);

  const organisation = await User.exists({ _id: data.organisation, role: 'organisation' });
  if (!organisation) throw new ApiError(404, 'Organisation not found');

  const request = await BloodRequest.create({ ...data, hospital: req.user._id });
  await populateParties(request);
  res.status(201).json({ success: true, message: 'Request sent to the organisation', request });
}

/**
 * GET /api/v1/requests?status=pending (hospital, organisation)
 * Hospitals see their own requests; organisations see requests addressed to them, each with the
 * stock they currently hold for that blood group.
 */
export async function listRequests(req, res) {
  const { status } = parse(requestListQuery, req.query);
  const filter = scopeFor(req.user);
  if (status) filter.status = status;

  const requests = await populateParties(BloodRequest.find(filter).sort({ createdAt: -1 })).lean();

  if (req.user.role === 'organisation') {
    const stock = await getStockSummary(req.user._id);
    const available = Object.fromEntries(stock.map((s) => [s.bloodGroup, s.available]));
    for (const request of requests) request.availableMl = available[request.bloodGroup];
  }

  res.json({ success: true, requests });
}

/** GET /api/v1/requests/stats (hospital, organisation): number of requests in each status. */
export async function requestStats(req, res) {
  const rows = await BloodRequest.aggregate([
    { $match: scopeFor(req.user) },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const stats = Object.fromEntries(REQUEST_STATUSES.map((status) => [status, 0]));
  for (const { _id, count } of rows) stats[_id] = count;
  res.json({ success: true, stats });
}

/** PATCH /api/v1/requests/:id/approve (organisation): issues the blood and marks the request approved. */
export async function approveRequest(req, res) {
  const { id } = parse(idParams, req.params);
  const scope = { organisation: req.user._id };

  const pending = await BloodRequest.findOne({ _id: id, ...scope }).populate('hospital');
  if (!pending) throw new ApiError(404, 'Request not found');
  if (pending.status !== 'pending') throw new ApiError(409, `This request is already ${pending.status}`);
  if (!pending.hospital) throw new ApiError(409, "The hospital's account no longer exists");

  // Claim the request first, then issue the blood. If issuing fails, the claim is undone.
  const request = await transitionFromPending(id, scope, { status: 'approved', respondedAt: new Date() });
  try {
    const inventory = await issueBlood({
      organisationId: req.user._id,
      bloodGroup: request.bloodGroup,
      quantity: request.quantity,
      hospital: pending.hospital._id,
      email: pending.hospital.email,
      request: request._id,
    });
    request.inventory = inventory._id;
    await request.save();
  } catch (error) {
    await BloodRequest.updateOne(
      { _id: id, status: 'approved', inventory: { $exists: false } },
      { $set: { status: 'pending' }, $unset: { respondedAt: 1 } },
    );
    throw error;
  }

  await populateParties(request);
  res.json({
    success: true,
    message: `Approved: ${request.quantity} ml of ${request.bloodGroup} issued to ${displayName(pending.hospital)}`,
    request,
  });
}

/** PATCH /api/v1/requests/:id/reject (organisation) */
export async function rejectRequest(req, res) {
  const { id } = parse(idParams, req.params);
  const { responseNote } = parse(rejectRequestSchema, req.body);
  const request = await transitionFromPending(
    id,
    { organisation: req.user._id },
    { status: 'rejected', respondedAt: new Date(), ...(responseNote && { responseNote }) },
  );
  await populateParties(request);
  res.json({ success: true, message: 'Request rejected', request });
}

/** PATCH /api/v1/requests/:id/cancel (hospital) */
export async function cancelRequest(req, res) {
  const { id } = parse(idParams, req.params);
  const request = await transitionFromPending(id, { hospital: req.user._id }, { status: 'cancelled' });
  await populateParties(request);
  res.json({ success: true, message: 'Request cancelled', request });
}
