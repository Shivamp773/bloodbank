import { Inventory } from '../models/inventoryModel.js';
import { User } from '../models/userModel.js';
import { DONATION_INTERVAL_DAYS } from '../config/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { addDays, formatDate, toObjectId } from '../utils/helpers.js';

/** When the donor last gave blood (at any organisation) and when they can give again. */
export async function getEligibility(donorId, now = new Date()) {
  const last = await Inventory.findOne({ donor: donorId, inventoryType: 'in' })
    .sort({ createdAt: -1 })
    .select('createdAt')
    .lean();
  const lastDonationAt = last?.createdAt ?? null;
  const nextEligibleAt = lastDonationAt ? addDays(lastDonationAt, DONATION_INTERVAL_DAYS) : null;
  return {
    lastDonationAt,
    nextEligibleAt,
    eligible: !nextEligibleAt || nextEligibleAt <= now,
    intervalDays: DONATION_INTERVAL_DAYS,
  };
}

/** Throws 409 if the donor gave blood too recently to donate at `at`. */
export async function assertEligible(donorId, at = new Date()) {
  const { nextEligibleAt } = await getEligibility(donorId, at);
  if (nextEligibleAt && nextEligibleAt > at) {
    throw new ApiError(
      409,
      `This donor gave blood less than ${DONATION_INTERVAL_DAYS} days ago and can donate again from ${formatDate(nextEligibleAt)}.`,
    );
  }
}

/** Number of donations, total ml and number of organisations for a donor. */
export async function getDonorStats(donorId) {
  const [row] = await Inventory.aggregate([
    { $match: { donor: toObjectId(donorId), inventoryType: 'in' } },
    {
      $group: {
        _id: null,
        donations: { $sum: 1 },
        totalMl: { $sum: '$quantity' },
        organisations: { $addToSet: '$organisation' },
      },
    },
  ]);
  return {
    donations: row?.donations ?? 0,
    totalMl: row?.totalMl ?? 0,
    organisations: row?.organisations.length ?? 0,
  };
}

/** Saves the blood group on the donor's profile the first time an organisation records it. */
export async function rememberBloodGroup(donorId, bloodGroup) {
  await User.updateOne({ _id: donorId, bloodGroup: { $exists: false } }, { $set: { bloodGroup } });
}
