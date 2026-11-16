import { Inventory } from '../models/inventoryModel.js';
import { User } from '../models/userModel.js';
import { BLOOD_GROUPS, DAY_MS, PUBLIC_USER_FIELDS } from '../config/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { lastNDays, publicUser, toObjectId } from '../utils/helpers.js';

/**
 * Totals per blood group, always in the same order as BLOOD_GROUPS.
 * Pass an organisation id for one organisation, or nothing for all organisations combined.
 */
export async function getStockSummary(organisationId) {
  const match = organisationId ? { organisation: toObjectId(organisationId) } : {};
  const rows = await Inventory.aggregate([
    { $match: match },
    {
      $group: {
        _id: { bloodGroup: '$bloodGroup', type: '$inventoryType' },
        total: { $sum: '$quantity' },
      },
    },
  ]);

  const byGroup = new Map(
    BLOOD_GROUPS.map((group) => [group, { bloodGroup: group, totalIn: 0, totalOut: 0, available: 0 }]),
  );
  for (const { _id, total } of rows) {
    const entry = byGroup.get(_id.bloodGroup);
    if (!entry) continue;
    if (_id.type === 'in') entry.totalIn += total;
    else entry.totalOut += total;
  }
  return BLOOD_GROUPS.map((group) => {
    const entry = byGroup.get(group);
    entry.available = entry.totalIn - entry.totalOut;
    return entry;
  });
}

/** Millilitres of one blood group an organisation currently holds. */
export async function getAvailable(organisationId, bloodGroup) {
  const [row] = await Inventory.aggregate([
    { $match: { organisation: toObjectId(organisationId), bloodGroup } },
    {
      $group: {
        _id: null,
        totalIn: { $sum: { $cond: [{ $eq: ['$inventoryType', 'in'] }, '$quantity', 0] } },
        totalOut: { $sum: { $cond: [{ $eq: ['$inventoryType', 'out'] }, '$quantity', 0] } },
      },
    },
  ]);
  return row ? row.totalIn - row.totalOut : 0;
}

const notEnoughStock = (available, bloodGroup) =>
  new ApiError(409, `Only ${Math.max(available, 0)} ml of ${bloodGroup} is available`);

/**
 * Creates an OUT record without ever overselling.
 * The record is inserted first and the stock re-checked afterwards: if a concurrent OUT pushed the
 * stock below zero, this record is removed again. This works on standalone MongoDB (no transactions).
 */
export async function issueBlood({ organisationId, bloodGroup, quantity, hospital, email, request }) {
  const available = await getAvailable(organisationId, bloodGroup);
  if (available < quantity) throw notEnoughStock(available, bloodGroup);

  const record = await Inventory.create({
    inventoryType: 'out',
    organisation: organisationId,
    bloodGroup,
    quantity,
    hospital,
    email,
    request,
  });

  const after = await getAvailable(organisationId, bloodGroup);
  if (after < 0) {
    await Inventory.deleteOne({ _id: record._id });
    throw notEnoughStock(after + quantity, bloodGroup);
  }
  return record;
}

/** Every organisation with how much of `bloodGroup` it holds, most stock first. */
export async function getAvailabilityByOrganisation(bloodGroup) {
  const [organisations, rows] = await Promise.all([
    User.find({ role: 'organisation' }).select(PUBLIC_USER_FIELDS).lean(),
    Inventory.aggregate([
      { $match: { bloodGroup } },
      {
        $group: {
          _id: '$organisation',
          totalIn: { $sum: { $cond: [{ $eq: ['$inventoryType', 'in'] }, '$quantity', 0] } },
          totalOut: { $sum: { $cond: [{ $eq: ['$inventoryType', 'out'] }, '$quantity', 0] } },
        },
      },
    ]),
  ]);
  const availableById = new Map(rows.map((row) => [String(row._id), row.totalIn - row.totalOut]));
  return organisations
    .map((org) => ({ organisation: publicUser(org), available: availableById.get(String(org._id)) ?? 0 }))
    .sort(
      (a, b) =>
        b.available - a.available || a.organisation.organisationName.localeCompare(b.organisation.organisationName),
    );
}

/**
 * Daily IN/OUT totals for the last `days` days (oldest first), bucketed by calendar day in `timeZone`.
 * Days without activity are included with zeros so charts get a continuous axis.
 */
export async function getDailyTrend({ organisationId, days = 30, timeZone = 'UTC', now = new Date() }) {
  const match = { createdAt: { $gte: new Date(now.getTime() - (days + 1) * DAY_MS) } };
  if (organisationId) match.organisation = toObjectId(organisationId);

  const rows = await Inventory.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: timeZone } },
          type: '$inventoryType',
        },
        total: { $sum: '$quantity' },
        count: { $sum: 1 },
      },
    },
  ]);

  const keys = lastNDays(days, timeZone, now);
  const byDay = new Map(keys.map((date) => [date, { date, in: 0, out: 0, donations: 0, issues: 0 }]));
  for (const { _id, total, count } of rows) {
    const entry = byDay.get(_id.day);
    if (!entry) continue;
    if (_id.type === 'in') {
      entry.in += total;
      entry.donations += count;
    } else {
      entry.out += total;
      entry.issues += count;
    }
  }
  return keys.map((date) => byDay.get(date));
}

/**
 * People on the other side of an organisation's records (or organisations on the other side of a
 * donor's/hospital's records), with how many transactions, how much blood and when the latest was.
 */
export async function getCounterpartsWithStats(match, groupField) {
  const rows = await Inventory.aggregate([
    { $match: match },
    {
      $group: {
        _id: `$${groupField}`,
        transactions: { $sum: 1 },
        totalMl: { $sum: '$quantity' },
        lastAt: { $max: '$createdAt' },
      },
    },
    { $sort: { lastAt: -1 } },
  ]);
  const ids = rows.map((row) => row._id).filter(Boolean);
  const users = await User.find({ _id: { $in: ids } })
    .select(PUBLIC_USER_FIELDS)
    .lean();
  const usersById = new Map(users.map((user) => [String(user._id), user]));

  // Accounts deleted by an admin keep their records but drop out of these lists.
  return rows
    .filter((row) => usersById.has(String(row._id)))
    .map((row) => ({
      ...publicUser(usersById.get(String(row._id))),
      transactions: row.transactions,
      totalMl: row.totalMl,
      lastAt: row.lastAt,
    }));
}
