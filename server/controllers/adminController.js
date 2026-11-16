import { User } from '../models/userModel.js';
import { Inventory } from '../models/inventoryModel.js';
import { BloodRequest } from '../models/requestModel.js';
import { Appointment } from '../models/appointmentModel.js';
import { PUBLIC_USER_FIELDS } from '../config/constants.js';
import { getDailyTrend, getStockSummary } from '../services/stockService.js';
import { ApiError } from '../utils/ApiError.js';
import { displayName } from '../utils/helpers.js';
import { adminUsersQuery, analyticsQuery, idParams, parse } from '../validation/schemas.js';

/** GET /api/v1/admin/users?role=donor|hospital|organisation */
export async function listUsers(req, res) {
  const { role } = parse(adminUsersQuery, req.query);
  const users = await User.find({ role }).sort({ createdAt: -1 }).select(PUBLIC_USER_FIELDS).lean();
  res.json({ success: true, total: users.length, users });
}

/**
 * DELETE /api/v1/admin/users/:id
 * Past inventory records are kept (they are the blood bank's history). Open requests and upcoming
 * appointments involving the account are closed so nobody is left waiting on it.
 */
export async function deleteUser(req, res) {
  const { id } = parse(idParams, req.params);

  if (id === String(req.user._id)) throw new ApiError(400, "You can't delete your own account");
  const target = await User.findById(id);
  if (!target) throw new ApiError(404, 'User not found');
  if (target.role === 'admin') throw new ApiError(403, "Admin accounts can't be deleted here");

  await target.deleteOne();

  const now = new Date();
  if (target.role === 'hospital') {
    await BloodRequest.updateMany(
      { hospital: id, status: 'pending' },
      { $set: { status: 'cancelled', responseNote: 'Hospital account was removed', respondedAt: now } },
    );
  } else if (target.role === 'organisation') {
    await BloodRequest.updateMany(
      { organisation: id, status: 'pending' },
      { $set: { status: 'rejected', responseNote: 'Organisation account was removed', respondedAt: now } },
    );
    await Appointment.updateMany(
      { organisation: id, status: 'scheduled' },
      { $set: { status: 'cancelled', cancelledBy: 'admin' } },
    );
  } else if (target.role === 'donor') {
    await Appointment.updateMany({ donor: id, status: 'scheduled' }, { $set: { status: 'cancelled', cancelledBy: 'admin' } });
  }

  res.json({ success: true, message: `${displayName(target)} was deleted` });
}

/** GET /api/v1/admin/overview?tz=Asia/Kolkata: system-wide numbers for the admin dashboard. */
export async function overview(req, res) {
  const { tz } = parse(analyticsQuery, req.query);

  const [roleCounts, stock, trend, transactions, pendingRequests, scheduledAppointments, recentUsers] =
    await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      getStockSummary(),
      getDailyTrend({ days: 30, timeZone: tz }),
      Inventory.countDocuments(),
      BloodRequest.countDocuments({ status: 'pending' }),
      Appointment.countDocuments({ status: 'scheduled' }),
      User.find({ role: { $ne: 'admin' } })
        .sort({ createdAt: -1 })
        .limit(5)
        .select(PUBLIC_USER_FIELDS)
        .lean(),
    ]);

  const counts = { donor: 0, hospital: 0, organisation: 0, admin: 0 };
  for (const { _id, count } of roleCounts) counts[_id] = count;

  res.json({
    success: true,
    counts,
    stock,
    trend,
    totals: {
      availableMl: stock.reduce((sum, s) => sum + s.available, 0),
      transactions,
      pendingRequests,
      scheduledAppointments,
    },
    recentUsers,
  });
}
