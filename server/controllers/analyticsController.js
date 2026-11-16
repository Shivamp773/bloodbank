import { Inventory } from '../models/inventoryModel.js';
import { BloodRequest } from '../models/requestModel.js';
import { Appointment } from '../models/appointmentModel.js';
import { User } from '../models/userModel.js';
import { DEFAULT_LOW_STOCK_THRESHOLD } from '../config/constants.js';
import { getDailyTrend, getStockSummary } from '../services/stockService.js';
import { analyticsQuery, parse, settingsSchema } from '../validation/schemas.js';

const thresholdOf = (user) => user.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
const lowGroups = (stock, threshold) => stock.filter((s) => s.available < threshold).map((s) => s.bloodGroup);

/** GET /api/v1/analytics/blood-groups (organisation): in/out/available for each of the 8 blood groups. */
export async function bloodGroups(req, res) {
  const threshold = thresholdOf(req.user);
  const bloodGroupData = await getStockSummary(req.user._id);
  res.json({ success: true, bloodGroupData, threshold, lowStock: lowGroups(bloodGroupData, threshold) });
}

/** GET /api/v1/analytics/overview?tz=Asia/Kolkata (organisation): data for the analytics dashboard. */
export async function overview(req, res) {
  const { tz } = parse(analyticsQuery, req.query);
  const organisation = req.user._id;
  const threshold = thresholdOf(req.user);

  const [stock, trend, donorIds, hospitalIds, pendingRequests, scheduledAppointments] = await Promise.all([
    getStockSummary(organisation),
    getDailyTrend({ organisationId: organisation, days: 30, timeZone: tz }),
    Inventory.distinct('donor', { organisation, inventoryType: 'in' }),
    Inventory.distinct('hospital', { organisation, inventoryType: 'out' }),
    BloodRequest.countDocuments({ organisation, status: 'pending' }),
    Appointment.countDocuments({ organisation, status: 'scheduled' }),
  ]);

  const last30Days = trend.reduce(
    (sum, day) => ({
      receivedMl: sum.receivedMl + day.in,
      issuedMl: sum.issuedMl + day.out,
      donations: sum.donations + day.donations,
      issues: sum.issues + day.issues,
    }),
    { receivedMl: 0, issuedMl: 0, donations: 0, issues: 0 },
  );

  res.json({
    success: true,
    threshold,
    stock,
    lowStock: lowGroups(stock, threshold),
    trend,
    totals: {
      availableMl: stock.reduce((sum, s) => sum + s.available, 0),
      donors: donorIds.length,
      hospitals: hospitalIds.length,
      pendingRequests,
      scheduledAppointments,
      last30Days,
    },
  });
}

/** PATCH /api/v1/analytics/settings (organisation): change the low-stock alert threshold. */
export async function updateSettings(req, res) {
  const { lowStockThreshold } = parse(settingsSchema, req.body);
  await User.updateOne({ _id: req.user._id }, { $set: { lowStockThreshold } });
  res.json({ success: true, message: `Low-stock alert set to ${lowStockThreshold} ml`, threshold: lowStockThreshold });
}
