import dayjs from 'dayjs';

export const formatDateTime = (value) => (value ? dayjs(value).format('DD MMM YYYY, hh:mm A') : '—');

export const formatDate = (value) => (value ? dayjs(value).format('DD MMM YYYY') : '—');

export const formatMl = (value) => `${Number(value ?? 0).toLocaleString()} ml`;

/** Human-readable name for any user, whatever their role. */
export const displayName = (user) =>
  user ? user.name || user.organisationName || user.hospitalName || user.email : 'Deleted account';

export const capitalize = (text = '') => text.charAt(0).toUpperCase() + text.slice(1);

/** The browser's IANA time zone, so daily charts match the user's calendar days. */
export const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/** Value for an <input type="datetime-local"> in the browser's local time. */
export const toDateTimeLocal = (value) => dayjs(value).format('YYYY-MM-DDTHH:mm');

/**
 * Turns a user-entered website into a safe link target. Anything that isn't http(s) gets "https://"
 * in front, so values like "javascript:..." can never become an executable link.
 */
export const toSafeUrl = (value) => {
  const text = value?.trim();
  if (!text) return null;
  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
};
