import { User } from '../models/userModel.js';
import { Inventory } from '../models/inventoryModel.js';

/**
 * One-time, idempotent fixes for databases created by version 1 of the app. Safe to run on every start.
 * - The donor role and field used to be spelled "donar".
 * - Emails used to be stored as typed; logins now compare them in lowercase.
 */
export async function migrate({ log = console.log } = {}) {
  const roles = await User.collection.updateMany({ role: 'donar' }, { $set: { role: 'donor' } });
  const fields = await Inventory.collection.updateMany(
    { donar: { $exists: true } },
    { $rename: { donar: 'donor' } },
  );

  let emails = { modifiedCount: 0 };
  try {
    emails = await User.collection.updateMany({ email: { $regex: '[A-Z]' } }, [
      { $set: { email: { $toLower: '$email' } } },
    ]);
  } catch (error) {
    if (error?.code !== 11000) throw error;
    log('Some emails could not be lowercased because two accounts differ only by letter case.');
  }

  const changed = roles.modifiedCount + fields.modifiedCount + emails.modifiedCount;
  if (changed > 0) {
    log(
      `Migrated data from v1: ${roles.modifiedCount} donor roles, ${fields.modifiedCount} inventory records, ` +
        `${emails.modifiedCount} emails.`,
    );
  }
  return { roles: roles.modifiedCount, inventory: fields.modifiedCount, emails: emails.modifiedCount };
}
