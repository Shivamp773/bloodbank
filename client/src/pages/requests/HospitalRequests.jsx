import { useState } from 'react';
import { FaClipboardList, FaPaperPlane } from 'react-icons/fa6';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { BloodChip, StatusBadge, UrgencyBadge } from '../../components/ui/Badges.jsx';
import { BloodGroupSelect, FormField, SelectField, TextAreaField } from '../../components/ui/FormField.jsx';
import { useApi } from '../../hooks/useApi.js';
import { fetchBadges } from '../../redux/badgesSlice.js';
import API, { getErrorMessage } from '../../services/api.js';
import { displayName, formatDateTime, formatMl } from '../../utils/format.js';

const EMPTY = { bloodGroup: '', quantity: '450', urgency: 'normal', organisation: '', note: '' };

export default function HospitalRequests() {
  const dispatch = useDispatch();
  const [form, setForm] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const requests = useApi('/requests');
  const availability = useApi(form.bloodGroup ? '/inventory/availability' : null, { bloodGroup: form.bloodGroup });
  const options = form.bloodGroup ? (availability.data?.organisations ?? []) : [];
  const chosen = options.find((o) => o.organisation._id === form.organisation);
  const shortBy = chosen && Number(form.quantity) > chosen.available;

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const refresh = () => {
    requests.reload();
    dispatch(fetchBadges());
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSending(true);
    try {
      const { data } = await API.post('/requests', { ...form, quantity: Number(form.quantity) });
      toast.success(data.message);
      setForm(EMPTY);
      refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const { data } = await API.patch(`/requests/${cancelTarget._id}/cancel`);
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
    { key: 'createdAt', header: 'Requested', className: 'text-nowrap', render: (r) => formatDateTime(r.createdAt) },
    { key: 'organisation', header: 'Organisation', render: (r) => displayName(r.organisation) },
    { key: 'bloodGroup', header: 'Blood group', render: (r) => <BloodChip group={r.bloodGroup} /> },
    { key: 'quantity', header: 'Quantity', className: 'text-end tabular', render: (r) => formatMl(r.quantity) },
    { key: 'urgency', header: 'Urgency', render: (r) => <UrgencyBadge urgency={r.urgency} /> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'responseNote',
      header: 'Note from organisation',
      render: (r) => r.responseNote || <span className="text-muted">—</span>,
    },
    {
      key: 'actions',
      header: <span className="visually-hidden">Actions</span>,
      className: 'text-end',
      render: (r) =>
        r.status === 'pending' && (
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setCancelTarget(r)}>
            Cancel
          </button>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        icon={FaClipboardList}
        title="Blood requests"
        subtitle="Ask a blood bank for blood. Approved requests appear under Received Blood."
      />

      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h5 mb-3">New request</h2>
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <BloodGroupSelect
                className="col-md-4"
                value={form.bloodGroup}
                onChange={(event) => setForm({ ...form, bloodGroup: event.target.value, organisation: '' })}
                required
              />
              <FormField
                className="col-md-4"
                label="Quantity (ml)"
                type="number"
                min={1}
                max={10000}
                step={1}
                value={form.quantity}
                onChange={update('quantity')}
                required
              />
              <SelectField className="col-md-4" label="Urgency" value={form.urgency} onChange={update('urgency')}>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="critical">Critical</option>
              </SelectField>
              <SelectField
                className="col-12"
                label="Organisation"
                value={form.organisation}
                onChange={update('organisation')}
                disabled={!form.bloodGroup || availability.loading}
                hint={
                  shortBy
                    ? `${chosen.organisation.organisationName} has ${formatMl(chosen.available)} right now. You can still send the request; they can approve it once stock arrives.`
                    : 'Organisations are listed with how much of this blood group they hold.'
                }
                required
              >
                <option value="">{form.bloodGroup ? 'Choose an organisation' : 'Choose a blood group first'}</option>
                {options.map(({ organisation, available }) => (
                  <option key={organisation._id} value={organisation._id}>
                    {organisation.organisationName} · {formatMl(available)} available
                  </option>
                ))}
              </SelectField>
              <TextAreaField
                className="col-12"
                label="Note (optional)"
                placeholder="e.g. scheduled surgery, patient details"
                maxLength={500}
                value={form.note}
                onChange={update('note')}
              />
            </div>
            <button type="submit" className="btn btn-primary mt-3" disabled={sending}>
              {sending ? (
                <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
              ) : (
                <FaPaperPlane className="me-2" aria-hidden="true" />
              )}
              Send request
            </button>
          </form>
        </div>
      </div>

      <h2 className="h5 mb-3">Your requests</h2>
      <DataTable
        caption="Your blood requests"
        columns={columns}
        rows={requests.data?.requests}
        loading={requests.loading}
        error={requests.error}
        onRetry={requests.reload}
        emptyMessage="You haven't requested any blood yet."
      />

      <ConfirmDialog
        show={Boolean(cancelTarget)}
        title="Cancel this request?"
        message={
          cancelTarget &&
          `${formatMl(cancelTarget.quantity)} of ${cancelTarget.bloodGroup} from ${displayName(cancelTarget.organisation)}.`
        }
        confirmLabel="Cancel request"
        variant="danger"
        busy={cancelling}
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </>
  );
}
