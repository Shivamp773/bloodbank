import { useState } from 'react';
import dayjs from 'dayjs';
import { FaCalendarCheck, FaCalendarPlus, FaCircleCheck, FaHourglassHalf } from 'react-icons/fa6';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { StatusBadge } from '../../components/ui/Badges.jsx';
import { FormField, SelectField, TextAreaField } from '../../components/ui/FormField.jsx';
import { useApi } from '../../hooks/useApi.js';
import { fetchBadges } from '../../redux/badgesSlice.js';
import API, { getErrorMessage } from '../../services/api.js';
import { displayName, formatDate, formatDateTime, formatMl, toDateTimeLocal } from '../../utils/format.js';

const MAX_DAYS_AHEAD = 90;
const EMPTY = { organisation: '', scheduledAt: '', note: '' };

function EligibilityCard({ eligibility, hasUpcoming }) {
  const { eligible, nextEligibleAt, lastDonationAt, intervalDays, stats } = eligibility;
  const daysLeft = nextEligibleAt ? Math.max(0, dayjs(nextEligibleAt).diff(dayjs(), 'day') + 1) : 0;
  return (
    <div className="card h-100">
      <div className="card-body">
        <div className={`d-flex align-items-center gap-2 fs-5 fw-semibold ${eligible ? 'text-success' : 'text-warning-emphasis'}`}>
          {eligible ? <FaCircleCheck aria-hidden="true" /> : <FaHourglassHalf aria-hidden="true" />}
          {eligible ? 'You can donate now' : `You can donate again from ${formatDate(nextEligibleAt)}`}
        </div>
        <p className="text-muted mt-2 mb-3">
          {!eligible
            ? `That's ${daysLeft} day${daysLeft === 1 ? '' : 's'} from now. Donations must be at least ${intervalDays} days apart so your body can recover.`
            : hasUpcoming
              ? 'Your appointment is booked. Thank you for donating!'
              : 'Book a slot with any blood bank.'}
        </p>
        <dl className="row mb-0 small">
          <dt className="col-6 text-muted fw-normal">Last donation</dt>
          <dd className="col-6 text-end">{formatDate(lastDonationAt)}</dd>
          <dt className="col-6 text-muted fw-normal">Donations</dt>
          <dd className="col-6 text-end tabular">{stats.donations}</dd>
          <dt className="col-6 text-muted fw-normal">Total donated</dt>
          <dd className="col-6 text-end tabular mb-0">{formatMl(stats.totalMl)}</dd>
        </dl>
      </div>
    </div>
  );
}

export default function DonorAppointments() {
  const dispatch = useDispatch();
  const eligibility = useApi('/appointments/eligibility');
  const organisations = useApi('/organisations');
  const appointments = useApi('/appointments');
  const [form, setForm] = useState(EMPTY);
  const [booking, setBooking] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const upcoming = appointments.data?.appointments.find((a) => a.status === 'scheduled');
  // Earliest bookable time: an hour from now, or the day the donor becomes eligible again.
  const nextEligible = eligibility.data?.nextEligibleAt;
  const oneHourFromNow = dayjs().add(1, 'hour');
  const earliest = nextEligible && dayjs(nextEligible).isAfter(oneHourFromNow) ? dayjs(nextEligible) : oneHourFromNow;
  const latest = dayjs().add(MAX_DAYS_AHEAD, 'day');

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const refresh = () => {
    appointments.reload();
    eligibility.reload();
    dispatch(fetchBadges());
  };

  const handleBook = async (event) => {
    event.preventDefault();
    setBooking(true);
    try {
      const { data } = await API.post('/appointments', {
        organisation: form.organisation,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        note: form.note,
      });
      toast.success(data.message);
      setForm(EMPTY);
      refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBooking(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const { data } = await API.patch(`/appointments/${cancelTarget._id}/cancel`);
      toast.success(data.message);
      setCancelTarget(null);
      refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setCancelling(false);
    }
  };

  const columns = [
    { key: 'scheduledAt', header: 'Date & time', render: (a) => formatDateTime(a.scheduledAt) },
    { key: 'organisation', header: 'Organisation', render: (a) => displayName(a.organisation) },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    { key: 'note', header: 'Note', render: (a) => a.note || <span className="text-muted">—</span> },
    {
      key: 'actions',
      header: <span className="visually-hidden">Actions</span>,
      className: 'text-end',
      render: (a) =>
        a.status === 'scheduled' && (
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setCancelTarget(a)}>
            Cancel
          </button>
        ),
    },
  ];

  let bookingBody;
  if (upcoming) {
    bookingBody = (
      <div className="alert alert-info mb-0">
        Your next appointment is on <strong>{formatDateTime(upcoming.scheduledAt)}</strong> at{' '}
        <strong>{displayName(upcoming.organisation)}</strong>. Cancel it below if you need to book a different slot.
      </div>
    );
  } else if (earliest.isAfter(latest)) {
    bookingBody = (
      <p className="text-muted mb-0">You can book once you are within {MAX_DAYS_AHEAD} days of your next eligible date.</p>
    );
  } else {
    bookingBody = (
      <form onSubmit={handleBook}>
        <SelectField label="Blood bank" value={form.organisation} onChange={update('organisation')} required>
          <option value="">Choose an organisation</option>
          {(organisations.data?.organisations ?? []).map((org) => (
            <option key={org._id} value={org._id}>
              {org.organisationName} · {org.address}
            </option>
          ))}
        </SelectField>
        <FormField
          label="Date and time"
          type="datetime-local"
          min={toDateTimeLocal(earliest)}
          max={toDateTimeLocal(latest)}
          value={form.scheduledAt}
          onChange={update('scheduledAt')}
          hint={`Any time between ${formatDate(earliest)} and ${formatDate(latest)}.`}
          required
        />
        <TextAreaField
          label="Note (optional)"
          placeholder="Anything the blood bank should know"
          maxLength={300}
          value={form.note}
          onChange={update('note')}
        />
        <button type="submit" className="btn btn-primary" disabled={booking}>
          {booking ? (
            <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
          ) : (
            <FaCalendarPlus className="me-2" aria-hidden="true" />
          )}
          Book appointment
        </button>
      </form>
    );
  }

  return (
    <>
      <PageHeader
        icon={FaCalendarCheck}
        title="Appointments"
        subtitle="Book a time to donate blood at a blood bank near you."
      />

      <div className="row g-3 mb-4">
        <div className="col-lg-5">
          {eligibility.data ? (
            <EligibilityCard eligibility={eligibility.data} hasUpcoming={Boolean(upcoming)} />
          ) : (
            <div className="card h-100" />
          )}
        </div>
        <div className="col-lg-7">
          <div className="card h-100">
            <div className="card-body">
              <h2 className="h5 mb-3">Book a donation</h2>
              {eligibility.data && appointments.data ? bookingBody : <p className="text-muted mb-0">Loading…</p>}
            </div>
          </div>
        </div>
      </div>

      <h2 className="h5 mb-3">Your appointments</h2>
      <DataTable
        caption="Your appointments"
        columns={columns}
        rows={appointments.data?.appointments}
        loading={appointments.loading}
        error={appointments.error}
        onRetry={appointments.reload}
        emptyMessage="No appointments yet."
      />

      <ConfirmDialog
        show={Boolean(cancelTarget)}
        title="Cancel this appointment?"
        message={cancelTarget && `${formatDateTime(cancelTarget.scheduledAt)} at ${displayName(cancelTarget.organisation)}.`}
        confirmLabel="Cancel appointment"
        variant="danger"
        busy={cancelling}
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </>
  );
}
