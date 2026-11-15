import { useState } from 'react';
import { FaCheck, FaClipboardList, FaXmark } from 'react-icons/fa6';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Modal from '../../components/ui/Modal.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { BloodChip, StatusBadge, UrgencyBadge } from '../../components/ui/Badges.jsx';
import { TextAreaField } from '../../components/ui/FormField.jsx';
import { useApi } from '../../hooks/useApi.js';
import { fetchBadges } from '../../redux/badgesSlice.js';
import API, { getErrorMessage } from '../../services/api.js';
import { capitalize, displayName, formatDateTime, formatMl } from '../../utils/format.js';

const TABS = ['pending', 'approved', 'rejected', 'cancelled', 'all'];

export default function OrganisationRequests() {
  const dispatch = useDispatch();
  const [tab, setTab] = useState('pending');
  const requests = useApi('/requests', tab === 'all' ? {} : { status: tab });
  const stats = useApi('/requests/stats');
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    requests.reload();
    stats.reload();
    dispatch(fetchBadges());
  };

  const respond = async (request, action, body) => {
    setBusy(true);
    try {
      const { data } = await API.patch(`/requests/${request._id}/${action}`, body);
      toast.success(data.message);
      setApproveTarget(null);
      setRejectTarget(null);
      setReason('');
      refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: 'createdAt', header: 'Requested', className: 'text-nowrap', render: (r) => formatDateTime(r.createdAt) },
    {
      key: 'hospital',
      header: 'Hospital',
      render: (r) => (
        <>
          <div className="fw-semibold">{displayName(r.hospital)}</div>
          <div className="small-muted">{r.hospital?.phone}</div>
        </>
      ),
    },
    { key: 'bloodGroup', header: 'Blood group', render: (r) => <BloodChip group={r.bloodGroup} /> },
    {
      key: 'quantity',
      header: 'Quantity',
      className: 'text-end tabular',
      render: (r) => (
        <>
          <div>{formatMl(r.quantity)}</div>
          {r.status === 'pending' && (
            <div className={`small ${r.availableMl >= r.quantity ? 'text-success' : 'text-danger'}`}>
              {formatMl(r.availableMl)} in stock
            </div>
          )}
        </>
      ),
    },
    { key: 'urgency', header: 'Urgency', render: (r) => <UrgencyBadge urgency={r.urgency} /> },
    {
      key: 'note',
      header: 'Note',
      render: (r) => r.note || r.responseNote || <span className="text-muted">—</span>,
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: <span className="visually-hidden">Actions</span>,
      className: 'text-end text-nowrap',
      render: (r) =>
        r.status === 'pending' && (
          <div className="d-inline-flex gap-2">
            <button type="button" className="btn btn-success btn-sm" onClick={() => setApproveTarget(r)}>
              <FaCheck aria-hidden="true" /> Approve
            </button>
            <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setRejectTarget(r)}>
              <FaXmark aria-hidden="true" /> Reject
            </button>
          </div>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        icon={FaClipboardList}
        title="Blood requests"
        subtitle="Requests from hospitals. Approving one issues the blood from your stock."
      />

      <ul className="nav nav-pills gap-2 mb-3" role="tablist">
        {TABS.map((name) => (
          <li key={name} className="nav-item" role="presentation">
            <button
              type="button"
              role="tab"
              aria-selected={tab === name}
              className={`nav-link${tab === name ? ' active' : ''}`}
              onClick={() => setTab(name)}
            >
              {capitalize(name)}
              {name !== 'all' && stats.data && (
                <span className={`badge ms-2 ${tab === name ? 'text-bg-light' : 'text-bg-secondary'}`}>
                  {stats.data.stats[name]}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <DataTable
        caption="Blood requests"
        columns={columns}
        rows={requests.data?.requests}
        loading={requests.loading}
        error={requests.error}
        onRetry={requests.reload}
        emptyMessage={tab === 'pending' ? 'No requests waiting for you.' : 'No requests here.'}
      />

      <ConfirmDialog
        show={Boolean(approveTarget)}
        title="Approve and issue blood?"
        message={
          approveTarget &&
          `${formatMl(approveTarget.quantity)} of ${approveTarget.bloodGroup} will be issued to ${displayName(approveTarget.hospital)} and taken from your stock.`
        }
        confirmLabel="Approve"
        variant="success"
        busy={busy}
        onConfirm={() => respond(approveTarget, 'approve')}
        onCancel={() => setApproveTarget(null)}
      />

      <Modal
        show={Boolean(rejectTarget)}
        title="Reject request"
        onClose={busy ? undefined : () => setRejectTarget(null)}
        footer={
          <>
            <button type="button" className="btn btn-light" onClick={() => setRejectTarget(null)} disabled={busy}>
              Cancel
            </button>
            <button type="submit" form="reject-form" className="btn btn-danger" disabled={busy}>
              {busy && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
              Reject request
            </button>
          </>
        }
      >
        <form
          id="reject-form"
          onSubmit={(event) => {
            event.preventDefault();
            respond(rejectTarget, 'reject', { responseNote: reason });
          }}
        >
          <p>
            {rejectTarget &&
              `${displayName(rejectTarget.hospital)} asked for ${formatMl(rejectTarget.quantity)} of ${rejectTarget.bloodGroup}.`}
          </p>
          <TextAreaField
            label="Reason (shown to the hospital)"
            placeholder="e.g. Not enough stock, please try another blood bank"
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mb-0"
          />
        </form>
      </Modal>
    </>
  );
}
