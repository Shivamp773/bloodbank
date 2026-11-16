import { Inventory } from '../models/inventoryModel.js';
import { User } from '../models/userModel.js';
import { PUBLIC_USER_FIELDS } from '../config/constants.js';
import { assertEligible, rememberBloodGroup } from '../services/eligibilityService.js';
import {
  getAvailabilityByOrganisation,
  getCounterpartsWithStats,
  issueBlood,
} from '../services/stockService.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex, withArticle } from '../utils/helpers.js';
import {
  availabilityQuery,
  createInventorySchema,
  listInventoryQuery,
  parse,
} from '../validation/schemas.js';

/**
 * POST /api/v1/inventory (organisation)
 * IN records blood received from a donor, OUT issues blood to a hospital.
 * The organisation always comes from the logged-in account, never from the request body.
 */
export async function createInventory(req, res) {
  const { inventoryType, bloodGroup, quantity, email } = parse(createInventorySchema, req.body);
  const expectedRole = inventoryType === 'in' ? 'donor' : 'hospital';

  const counterpart = await User.findOne({ email });
  if (!counterpart) {
    throw new ApiError(404, `No ${expectedRole} account found with the email ${email}`);
  }
  if (counterpart.role !== expectedRole) {
    throw new ApiError(
      400,
      `${email} belongs to ${withArticle(counterpart.role)} account. ` +
        (inventoryType === 'in' ? 'Blood can only be received from donors.' : 'Blood can only be issued to hospitals.'),
    );
  }

  let inventory;
  if (inventoryType === 'in') {
    await assertEligible(counterpart._id);
    inventory = await Inventory.create({
      inventoryType,
      bloodGroup,
      quantity,
      email: counterpart.email,
      organisation: req.user._id,
      donor: counterpart._id,
    });
    await rememberBloodGroup(counterpart._id, bloodGroup);
  } else {
    inventory = await issueBlood({
      organisationId: req.user._id,
      bloodGroup,
      quantity,
      hospital: counterpart._id,
      email: counterpart.email,
    });
  }

  res.status(201).json({
    success: true,
    message: inventoryType === 'in' ? 'Donation recorded' : 'Blood issued to hospital',
    inventory,
  });
}

/** GET /api/v1/inventory (organisation): paginated, filterable list of the organisation's records. */
export async function listInventory(req, res) {
  const { page, limit, bloodGroup, inventoryType, search } = parse(listInventoryQuery, req.query);

  const filter = { organisation: req.user._id };
  if (bloodGroup) filter.bloodGroup = bloodGroup;
  if (inventoryType) filter.inventoryType = inventoryType;
  if (search) filter.email = { $regex: escapeRegex(search), $options: 'i' };

  const [inventory, total] = await Promise.all([
    Inventory.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('donor', PUBLIC_USER_FIELDS)
      .populate('hospital', PUBLIC_USER_FIELDS)
      .lean(),
    Inventory.countDocuments(filter),
  ]);

  res.json({
    success: true,
    inventory,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
}

/** GET /api/v1/inventory/recent (organisation): the latest five records. */
export async function recentInventory(req, res) {
  const inventory = await Inventory.find({ organisation: req.user._id })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('donor', PUBLIC_USER_FIELDS)
    .populate('hospital', PUBLIC_USER_FIELDS)
    .lean();
  res.json({ success: true, inventory });
}

/** GET /api/v1/inventory/donors (organisation): donors who gave blood to this organisation. */
export async function listDonors(req, res) {
  const donors = await getCounterpartsWithStats({ organisation: req.user._id, inventoryType: 'in' }, 'donor');
  res.json({ success: true, donors });
}

/** GET /api/v1/inventory/hospitals (organisation): hospitals this organisation supplied. */
export async function listHospitals(req, res) {
  const hospitals = await getCounterpartsWithStats({ organisation: req.user._id, inventoryType: 'out' }, 'hospital');
  res.json({ success: true, hospitals });
}

/** GET /api/v1/inventory/organisations (donor, hospital): organisations the user has dealt with. */
export async function myOrganisations(req, res) {
  const match =
    req.user.role === 'donor'
      ? { donor: req.user._id, inventoryType: 'in' }
      : { hospital: req.user._id, inventoryType: 'out' };
  const organisations = await getCounterpartsWithStats(match, 'organisation');
  res.json({ success: true, organisations });
}

/**
 * GET /api/v1/inventory/history (donor, hospital)
 * Donors get the donations they made, hospitals the blood they received. Always scoped to the
 * logged-in user on the server.
 */
export async function myHistory(req, res) {
  const filter =
    req.user.role === 'donor'
      ? { donor: req.user._id, inventoryType: 'in' }
      : { hospital: req.user._id, inventoryType: 'out' };
  const inventory = await Inventory.find(filter)
    .sort({ createdAt: -1 })
    .populate('organisation', PUBLIC_USER_FIELDS)
    .lean();
  res.json({ success: true, inventory });
}

/** GET /api/v1/inventory/availability?bloodGroup=A%2B (hospital, organisation) */
export async function availability(req, res) {
  const { bloodGroup } = parse(availabilityQuery, req.query);
  const organisations = await getAvailabilityByOrganisation(bloodGroup);
  res.json({ success: true, bloodGroup, organisations });
}
