import { Appointment } from '../models/appointmentModel.js';
import { Inventory } from '../models/inventoryModel.js';
import { User } from '../models/userModel.js';
import { APPOINTMENT_STATUSES, MAX_BOOKING_DAYS_AHEAD, PUBLIC_USER_FIELDS } from '../config/constants.js';
import {
  assertEligible,
  getDonorStats,
  getEligibility,
  rememberBloodGroup,
} from '../services/eligibilityService.js';
import { ApiError } from '../utils/ApiError.js';
import { addDays, formatDate } from '../utils/helpers.js';
import {
  appointmentListQuery,
  completeAppointmentSchema,
  createAppointmentSchema,
  idParams,
  parse,
} from '../validation/schemas.js';

const scopeFor = (user) => (user.role === 'donor' ? { donor: user._id } : { organisation: user._id });

// Works on both queries and documents (a document's populate() returns a promise, so it can't be chained).
const populateParties = (target) =>
  target.populate([
    { path: 'donor', select: PUBLIC_USER_FIELDS },
    { path: 'organisation', select: PUBLIC_USER_FIELDS },
  ]);

/** Atomically moves an appointment out of `scheduled`, or explains why it can't. */
async function transitionFromScheduled(id, scope, update) {
  const updated = await Appointment.findOneAndUpdate(
    { _id: id, ...scope, status: 'scheduled' },
    { $set: update },
    { returnDocument: 'after' },
  );
  if (updated) return updated;

  const existing = await Appointment.findOne({ _id: id, ...scope }).select('status').lean();
  if (!existing) throw new ApiError(404, 'Appointment not found');
  throw new ApiError(409, `This appointment is already ${existing.status}`);
}

/** GET /api/v1/appointments/eligibility (donor): last donation, next eligible date and totals. */
export async function eligibility(req, res) {
  const [status, stats] = await Promise.all([getEligibility(req.user._id), getDonorStats(req.user._id)]);
  res.json({ success: true, ...status, stats });
}

/** POST /api/v1/appointments (donor): book a donation slot with an organisation. */
export async function createAppointment(req, res) {
  const { organisation, scheduledAt, note } = parse(createAppointmentSchema, req.body);
  const now = new Date();

  if (scheduledAt <= now) throw new ApiError(400, 'Choose a date and time in the future');
  if (scheduledAt > addDays(now, MAX_BOOKING_DAYS_AHEAD)) {
    throw new ApiError(400, `Appointments can be booked up to ${MAX_BOOKING_DAYS_AHEAD} days ahead`);
  }
  if (!(await User.exists({ _id: organisation, role: 'organisation' }))) {
    throw new ApiError(404, 'Organisation not found');
  }

  const { nextEligibleAt } = await getEligibility(req.user._id, now);
  if (nextEligibleAt && scheduledAt < nextEligibleAt) {
    throw new ApiError(409, `You can donate again from ${formatDate(nextEligibleAt)}. Choose a date on or after that day.`);
  }

  const alreadyBooked = 'You already have an upcoming appointment. Cancel it before booking another.';
  if (await Appointment.exists({ donor: req.user._id, status: 'scheduled' })) throw new ApiError(409, alreadyBooked);

  let appointment;
  try {
    appointment = await Appointment.create({ donor: req.user._id, organisation, scheduledAt, note });
  } catch (error) {
    // A unique index allows one scheduled appointment per donor, even under concurrent requests.
    if (error?.code === 11000) throw new ApiError(409, alreadyBooked);
    throw error;
  }

  await populateParties(appointment);
  res.status(201).json({ success: true, message: 'Appointment booked', appointment });
}

/** GET /api/v1/appointments?status=scheduled (donor, organisation) */
export async function listAppointments(req, res) {
  const { status } = parse(appointmentListQuery, req.query);
  const filter = scopeFor(req.user);
  if (status) filter.status = status;
  const appointments = await populateParties(Appointment.find(filter).sort({ scheduledAt: -1 })).lean();
  res.json({ success: true, appointments });
}

/** GET /api/v1/appointments/stats (donor, organisation): number of appointments in each status. */
export async function appointmentStats(req, res) {
  const rows = await Appointment.aggregate([
    { $match: scopeFor(req.user) },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const stats = Object.fromEntries(APPOINTMENT_STATUSES.map((status) => [status, 0]));
  for (const { _id, count } of rows) stats[_id] = count;
  res.json({ success: true, stats });
}

/** PATCH /api/v1/appointments/:id/complete (organisation): records the donation as an IN entry. */
export async function completeAppointment(req, res) {
  const { id } = parse(idParams, req.params);
  const { bloodGroup, quantity } = parse(completeAppointmentSchema, req.body);
  const scope = { organisation: req.user._id };

  const scheduled = await Appointment.findOne({ _id: id, ...scope }).populate('donor');
  if (!scheduled) throw new ApiError(404, 'Appointment not found');
  if (scheduled.status !== 'scheduled') throw new ApiError(409, `This appointment is already ${scheduled.status}`);
  if (!scheduled.donor) throw new ApiError(409, "The donor's account no longer exists");
  const donor = scheduled.donor;
  await assertEligible(donor._id);

  // Claim the appointment first so a double click can't record the donation twice.
  const appointment = await transitionFromScheduled(id, scope, { status: 'completed', completedAt: new Date() });
  let inventory;
  try {
    inventory = await Inventory.create({
      inventoryType: 'in',
      bloodGroup,
      quantity,
      email: donor.email,
      organisation: req.user._id,
      donor: donor._id,
      appointment: appointment._id,
    });
    appointment.inventory = inventory._id;
    await appointment.save();
  } catch (error) {
    await Appointment.updateOne(
      { _id: id, status: 'completed', inventory: { $exists: false } },
      { $set: { status: 'scheduled' }, $unset: { completedAt: 1 } },
    );
    throw error;
  }
  await rememberBloodGroup(donor._id, bloodGroup);

  await populateParties(appointment);
  res.json({ success: true, message: `Donation of ${quantity} ml recorded`, appointment, inventory });
}

/** PATCH /api/v1/appointments/:id/no-show (organisation): only once the appointment time has passed. */
export async function markNoShow(req, res) {
  const { id } = parse(idParams, req.params);
  const scope = { organisation: req.user._id };

  const existing = await Appointment.findOne({ _id: id, ...scope }).select('scheduledAt status').lean();
  if (!existing) throw new ApiError(404, 'Appointment not found');
  if (existing.status === 'scheduled' && existing.scheduledAt > new Date()) {
    throw new ApiError(409, 'You can mark a no-show only after the appointment time');
  }

  const appointment = await transitionFromScheduled(id, scope, { status: 'no-show' });
  await populateParties(appointment);
  res.json({ success: true, message: 'Marked as no-show', appointment });
}

/** PATCH /api/v1/appointments/:id/cancel (donor, organisation) */
export async function cancelAppointment(req, res) {
  const { id } = parse(idParams, req.params);
  const appointment = await transitionFromScheduled(id, scopeFor(req.user), {
    status: 'cancelled',
    cancelledBy: req.user.role,
  });
  await populateParties(appointment);
  res.json({ success: true, message: 'Appointment cancelled', appointment });
}
