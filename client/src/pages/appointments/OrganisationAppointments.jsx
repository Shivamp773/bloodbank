import { useState } from 'react';
import { FaCalendarCheck, FaCheck } from 'react-icons/fa6';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Modal from '../../components/ui/Modal.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { BloodChip, StatusBadge } from '../../components/ui/Badges.jsx';
import { BloodGroupSelect, FormField } from '../../components/ui/FormField.jsx';
import { useApi } from '../../hooks/useApi.js';
import { fetchBadges } from '../../redux/badgesSlice.js';
import API, { getErrorMessage } from '../../services/api.js';
import { displayName, formatDateTime } from '../../utils/format.js';

const isPast = (date) => new Date(date) <= new Date();

export default function OrganisationAppointments() {
  const dispatch = useDispatch();
  const appointments = useApi('/appointments');
  const [tab, setTab] = useState('upcoming');
  const [completeTarget, setCompleteTarget] = useState(null);
  const [donation, setDonation] = useState({ bloodGroup: '', quantity: '450' });
  const [confirm, setConfirm] = useState(null); // { appointment, action: 'no-show' | 'cancel' }
  const [busy, setBusy] = useState(false);

  const all = appointments.data?.appointments ?? [];
  const upcoming = all
    .filter((a) => a.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  const history = all.filter((a) => a.status !== 'scheduled');

  const act = async (appointment, action, body) => {
    setBusy(true);
    try {
      const { data } = await API.patch(`/appointments/${appointment._id}/${action}`, body);
      toast.success(data.message);
      setCompleteTarget(null);
      setConfirm(null);
      appointments.reload();
      dispatch(fetchBadges());
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const openComplete = (appointment) => {
    setDonation({ bloodGroup: appointment.donor?.bloodGroup ?? '', quantity: '450' });
    setCompleteTarget(appointment);
  };

  const columns = [
    {
      key: 'scheduledAt',
      header: 'Date & time',
      className: 'text-nowrap',
      render: (a) => (
        <>
          {formatDateTime(a.scheduledAt)}
          {a.status === 'scheduled' && isPast(a.scheduledAt) && (
            <span className="badge text-bg-warning ms-2">Overdue</span>
          )}
        </>
      ),
    },
    {
      key: 'donor',
      header: 'Donor',
      render: (a) => (
        <>
          <div className="fw-semibold">{displayName(a.donor)}</div>
          <div className="small-muted">
            {a.donor?.email} {a.donor?.phone && `· ${a.donor.phone}`}
          </div>
        </>
      ),
    },
    { key: 'bloodGroup', header: 'Blood group', render: (a) => <BloodChip group={a.donor?.bloodGroup} /> },
    { key: 'note', header: 'Note', render: (a) => a.note || <span className="text-muted">—</span> },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    {
      key: 'actions',
      header: <span className="visually-hidden">Actions</span>,
      className: 'text-end text-nowrap',
      render: (a) =>
        a.status === 'scheduled' && (
          <div className="d-inline-flex gap-2">
            <button type="button" className="btn btn-success btn-sm" onClick={() => openComplete(a)} disabled={!a.donor}>
              <FaCheck aria-hidden="true" /> Complete
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setConfirm({ appointment: a, action: 'no-show' })}
              disabled={!isPast(a.scheduledAt)}
              title={isPast(a.scheduledAt) ? undefined : 'Available after the appointment time'}
            >
              No-show
            </button>
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={() => setConfirm({ appointment: a, action: 'cancel' })}
            >
              Cancel
            </button>
          </div>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        icon={FaCalendarCheck}
        title="Appointments"
        subtitle="Donors who booked a donation with you. Completing one records the donation in your inventory."
      />

      <ul className="nav nav-pills gap-2 mb-3" role="tablist">
        {[
          ['upcoming', `Upcoming (${upcoming.length})`],
          ['history', `History (${history.length})`],
        ].map(([name, label]) => (
          <li key={name} className="nav-item" role="presentation">
            <button
              type="button"
              role="tab"
              aria-selected={tab === name}
              className={`nav-link${tab === name ? ' active' : ''}`}
              onClick={() => setTab(name)}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>

      <DataTable
        caption={tab === 'upcoming' ? 'Upcoming appointments' : 'Past appointments'}
        columns={columns}
        rows={tab === 'upcoming' ? upcoming : history}
        loading={appointments.loading}
        error={appointments.error}
        onRetry={appointments.reload}
        emptyMessage={tab === 'upcoming' ? 'No upcoming appointments.' : 'No past appointments yet.'}
      />

      <Modal
        show={Boolean(completeTarget)}
        title="Record donation"
        onClose={busy ? undefined : () => setCompleteTarget(null)}
        footer={
          <>
            <button type="button" className="btn btn-light" onClick={() => setCompleteTarget(null)} disabled={busy}>
              Cancel
            </button>
            <button type="submit" form="complete-form" className="btn btn-success" disabled={busy}>
              {busy && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
              Record donation
            </button>
          </>
        }
      >
        <form
          id="complete-form"
          onSubmit={(event) => {
            event.preventDefault();
            act(completeTarget, 'complete', { ...donation, quantity: Number(donation.quantity) });
          }}
        >
          <p className="text-muted">
            {completeTarget && `${displayName(completeTarget.donor)} · ${formatDateTime(completeTarget.scheduledAt)}`}
          </p>
          <BloodGroupSelect
            value={donation.bloodGroup}
            onChange={(event) => setDonation({ ...donation, bloodGroup: event.target.value })}
            hint={completeTarget?.donor?.bloodGroup ? 'Pre-filled from the donor profile.' : undefined}
            required
          />
          <FormField
            label="Quantity (ml)"
            type="number"
            min={1}
            max={10000}
            step={1}
            value={donation.quantity}
            onChange={(event) => setDonation({ ...donation, quantity: event.target.value })}
            required
            className="mb-0"
          />
        </form>
      </Modal>

      <ConfirmDialog
        show={Boolean(confirm)}
        title={confirm?.action === 'no-show' ? 'Mark as no-show?' : 'Cancel this appointment?'}
        message={
          confirm &&
          `${displayName(confirm.appointment.donor)} · ${formatDateTime(confirm.appointment.scheduledAt)}`
        }
        confirmLabel={confirm?.action === 'no-show' ? 'Mark no-show' : 'Cancel appointment'}
        variant={confirm?.action === 'no-show' ? 'secondary' : 'danger'}
        busy={busy}
        onConfirm={() => act(confirm.appointment, confirm.action)}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}
