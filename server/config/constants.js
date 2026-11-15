export const ROLES = Object.freeze({
  ADMIN: 'admin',
  ORGANISATION: 'organisation',
  DONOR: 'donor',
  HOSPITAL: 'hospital',
});

export const ROLE_LIST = Object.values(ROLES);

/** Roles that can sign up from the Register page. Admins are created by the seed or `npm run create-admin`. */
export const SELF_REGISTER_ROLES = [ROLES.DONOR, ROLES.HOSPITAL, ROLES.ORGANISATION];

export const BLOOD_GROUPS = ['O+', 'O-', 'AB+', 'AB-', 'A+', 'A-', 'B+', 'B-'];

export const INVENTORY_TYPES = ['in', 'out'];

/** Upper bound for a single inventory entry or request, to catch typos such as 45000 instead of 450. */
export const MAX_QUANTITY_ML = 10000;

/**
 * Minimum gap between two whole-blood donations by the same donor.
 * Guidelines differ by country (commonly 8 to 16 weeks); 90 days is a conservative default.
 */
export const DONATION_INTERVAL_DAYS = 90;

/** How far ahead a donor can book an appointment. */
export const MAX_BOOKING_DAYS_AHEAD = 90;

/** Organisations get a low-stock warning for any blood group below this many ml, unless they set their own. */
export const DEFAULT_LOW_STOCK_THRESHOLD = 1000;

export const REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];
export const REQUEST_URGENCIES = ['normal', 'urgent', 'critical'];

export const APPOINTMENT_STATUSES = ['scheduled', 'completed', 'cancelled', 'no-show'];

/** Fields of another user that are safe to send to the client. */
export const PUBLIC_USER_FIELDS =
  'role name organisationName hospitalName email phone address website bloodGroup createdAt';

export const DAY_MS = 24 * 60 * 60 * 1000;
