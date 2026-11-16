import { z } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { isValidTimeZone } from '../utils/helpers.js';
import {
  APPOINTMENT_STATUSES,
  BLOOD_GROUPS,
  INVENTORY_TYPES,
  MAX_QUANTITY_ML,
  REQUEST_STATUSES,
  REQUEST_URGENCIES,
  ROLE_LIST,
  SELF_REGISTER_ROLES,
} from '../config/constants.js';

/**
 * Validates `data` against a zod schema and returns the parsed (trimmed, coerced) value.
 * Throws a 400 ApiError listing every invalid field. Because every input goes through a schema,
 * query objects such as `{ "$ne": null }` can never reach a database query.
 */
export function parse(schema, data) {
  const result = schema.safeParse(data ?? {});
  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || undefined,
      message: issue.message,
    }));
    throw new ApiError(400, errors[0].message, errors);
  }
  return result.data;
}

// Treat empty strings from HTML forms and query strings as "not provided".
const emptyToUndefined = (schema) => z.preprocess((value) => (value === '' ? undefined : value), schema);

const requiredText = (label, max) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalText = (label, max) =>
  z
    .string({ error: `${label} must be text` })
    .trim()
    .max(max, `${label} must be at most ${max} characters`)
    .optional()
    .transform((value) => value || undefined);

const email = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .pipe(z.email('Enter a valid email address'));

const phone = requiredText('Phone number', 20).refine((value) => {
  const digits = value.replace(/\D/g, '').length;
  return /^\+?[\d\s()-]+$/.test(value) && digits >= 7 && digits <= 15;
}, 'Enter a valid phone number');

const objectId = (label) =>
  z.string({ error: `${label} is required` }).regex(/^[a-f\d]{24}$/i, `Invalid ${label.toLowerCase()}`);

const bloodGroup = z.enum(BLOOD_GROUPS, { error: 'Choose a valid blood group' });

const quantity = z.coerce
  .number({ error: 'Quantity must be a number' })
  .int('Quantity must be a whole number of ml')
  .min(1, 'Quantity must be at least 1 ml')
  .max(MAX_QUANTITY_ML, `Quantity can't exceed ${MAX_QUANTITY_ML} ml`);

const timeZone = emptyToUndefined(
  z.string().trim().max(64).refine(isValidTimeZone, 'Invalid time zone').optional().default('UTC'),
);

// ---------- Auth ----------

const ROLE_NAME_FIELD = {
  donor: ['name', 'Name'],
  organisation: ['organisationName', 'Organisation name'],
  hospital: ['hospitalName', 'Hospital name'],
};

export const registerSchema = z
  .object({
    role: z.enum(SELF_REGISTER_ROLES, { error: 'Choose donor, hospital or organisation' }),
    name: optionalText('Name', 100),
    organisationName: optionalText('Organisation name', 120),
    hospitalName: optionalText('Hospital name', 120),
    email,
    password: z
      .string({ error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password must be at most 72 characters'),
    address: requiredText('Address', 200),
    phone,
    website: optionalText('Website', 200),
    bloodGroup: emptyToUndefined(bloodGroup.optional()),
  })
  .superRefine((data, ctx) => {
    const [field, label] = ROLE_NAME_FIELD[data.role];
    if (!data[field]) ctx.addIssue({ code: 'custom', path: [field], message: `${label} is required` });
  });

export const loginSchema = z.object({
  email,
  password: z.string({ error: 'Password is required' }).min(1, 'Password is required').max(200),
  role: z.enum(ROLE_LIST, { error: 'Choose the role you registered with' }),
});

// ---------- Inventory ----------

export const createInventorySchema = z.object({
  inventoryType: z.enum(INVENTORY_TYPES, { error: 'Choose IN or OUT' }),
  bloodGroup,
  quantity,
  email,
});

export const listInventoryQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  bloodGroup: emptyToUndefined(bloodGroup.optional()),
  inventoryType: emptyToUndefined(z.enum(INVENTORY_TYPES).optional()),
  search: optionalText('Search', 100),
});

export const availabilityQuery = z.object({ bloodGroup });

export const idParams = z.object({ id: objectId('ID') });

// ---------- Blood requests ----------

export const createRequestSchema = z.object({
  organisation: objectId('Organisation'),
  bloodGroup,
  quantity,
  urgency: emptyToUndefined(z.enum(REQUEST_URGENCIES).optional().default('normal')),
  note: optionalText('Note', 500),
});

export const rejectRequestSchema = z.object({
  responseNote: optionalText('Reason', 500),
});

export const requestListQuery = z.object({
  status: emptyToUndefined(z.enum(REQUEST_STATUSES).optional()),
});

// ---------- Appointments ----------

export const createAppointmentSchema = z.object({
  organisation: objectId('Organisation'),
  scheduledAt: z.coerce.date({ error: 'Choose a valid date and time' }),
  note: optionalText('Note', 300),
});

export const completeAppointmentSchema = z.object({ bloodGroup, quantity });

export const appointmentListQuery = z.object({
  status: emptyToUndefined(z.enum(APPOINTMENT_STATUSES).optional()),
});

// ---------- Analytics & admin ----------

export const analyticsQuery = z.object({ tz: timeZone });

export const settingsSchema = z.object({
  lowStockThreshold: z.coerce
    .number({ error: 'Threshold must be a number' })
    .int('Threshold must be a whole number of ml')
    .min(0, "Threshold can't be negative")
    .max(1_000_000, 'Threshold is too large'),
});

export const adminUsersQuery = z.object({
  role: z.enum(SELF_REGISTER_ROLES, { error: 'Choose donor, hospital or organisation' }),
});
