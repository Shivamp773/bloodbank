import mongoose from 'mongoose';
import { DAY_MS } from '../config/constants.js';

export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const addDays = (date, days) => new Date(new Date(date).getTime() + days * DAY_MS);

export const toObjectId = (id) =>
  id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(String(id));

/** "a donor", "an organisation", ... */
export const withArticle = (word) => `${/^[aeiou]/i.test(word) ? 'an' : 'a'} ${word}`;

/** Human-readable name for any user, whatever their role. */
export const displayName = (user) =>
  user ? user.name || user.organisationName || user.hospitalName || user.email : 'Deleted account';

/** Strips internal fields from a lean user document. */
export const publicUser = (user) => {
  if (!user) return null;
  const { password, __v, lowStockThreshold, ...rest } = user;
  return rest;
};

/** "15 Nov 2026" */
export const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const isValidTimeZone = (timeZone) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
};

/**
 * The last `days` calendar dates (YYYY-MM-DD) ending today in `timeZone`.
 * Uses calendar arithmetic, so daylight-saving changes never skip or repeat a day.
 */
export const lastNDays = (days, timeZone, now = new Date()) => {
  const todayKey = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const [year, month, day] = todayKey.split('-').map(Number);
  const keys = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    keys.push(new Date(Date.UTC(year, month - 1, day - offset)).toISOString().slice(0, 10));
  }
  return keys;
};
