import { capitalize } from '../../utils/format.js';

const STATUS_STYLES = {
  pending: 'text-bg-warning',
  approved: 'text-bg-success',
  rejected: 'text-bg-danger',
  cancelled: 'text-bg-secondary',
  scheduled: 'text-bg-primary',
  completed: 'text-bg-success',
  'no-show': 'text-bg-dark',
};

const URGENCY_STYLES = {
  normal: 'text-bg-light border',
  urgent: 'text-bg-warning',
  critical: 'text-bg-danger',
};

export function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_STYLES[status] ?? 'text-bg-light'}`}>{capitalize(status)}</span>;
}

export function UrgencyBadge({ urgency }) {
  return <span className={`badge ${URGENCY_STYLES[urgency] ?? 'text-bg-light'}`}>{capitalize(urgency)}</span>;
}

/** IN (received from a donor) or OUT (issued to a hospital). */
export function TypeBadge({ type }) {
  return type === 'in' ? (
    <span className="badge text-bg-success">IN</span>
  ) : (
    <span className="badge text-bg-danger">OUT</span>
  );
}

export function BloodChip({ group }) {
  return group ? <span className="blood-chip">{group}</span> : <span className="text-muted">—</span>;
}
