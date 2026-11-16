import { useState } from 'react';
import {
  FaArrowDown,
  FaArrowUp,
  FaCalendarCheck,
  FaChartColumn,
  FaClipboardList,
  FaDroplet,
  FaTriangleExclamation,
  FaUsers,
} from 'react-icons/fa6';
import { Link } from 'react-router';
import { toast } from 'react-toastify';
import StockChart from '../../components/charts/StockChart.jsx';
import TrendChart from '../../components/charts/TrendChart.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import StatTile from '../../components/ui/StatTile.jsx';
import { BloodChip, TypeBadge } from '../../components/ui/Badges.jsx';
import { useApi } from '../../hooks/useApi.js';
import API, { getErrorMessage } from '../../services/api.js';
import { browserTimeZone, displayName, formatDateTime, formatMl } from '../../utils/format.js';

const recentColumns = [
  { key: 'bloodGroup', header: 'Blood group', render: (r) => <BloodChip group={r.bloodGroup} /> },
  { key: 'inventoryType', header: 'Type', render: (r) => <TypeBadge type={r.inventoryType} /> },
  { key: 'quantity', header: 'Quantity', className: 'text-end tabular', render: (r) => formatMl(r.quantity) },
  {
    key: 'party',
    header: 'Donor / hospital',
    render: (r) => displayName(r.inventoryType === 'in' ? r.donor : r.hospital),
  },
  { key: 'createdAt', header: 'Date & time', render: (r) => formatDateTime(r.createdAt) },
];

function ThresholdForm({ threshold, onSaved }) {
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const value = Number(new FormData(event.currentTarget).get('threshold'));
    setSaving(true);
    try {
      const { data } = await API.patch('/analytics/settings', { lowStockThreshold: value });
      toast.success(data.message);
      onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3">
      <label htmlFor="threshold" className="form-label fw-semibold">
        Alert me when a blood group falls below
      </label>
      <div className="input-group">
        {/* `key` resets the field when the saved value changes. */}
        <input
          key={threshold}
          id="threshold"
          name="threshold"
          type="number"
          className="form-control"
          min={0}
          step={50}
          defaultValue={threshold}
          required
        />
        <span className="input-group-text">ml</span>
        <button type="submit" className="btn btn-outline-primary" disabled={saving}>
          {saving && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
          Save
        </button>
      </div>
    </form>
  );
}

export default function Analytics() {
  const overview = useApi('/analytics/overview', { tz: browserTimeZone() });
  const recent = useApi('/inventory/recent');
  const data = overview.data;

  if (!data) {
    return (
      <>
        <PageHeader icon={FaChartColumn} title="Analytics" />
        {overview.error ? <div className="alert alert-danger">{overview.error}</div> : <Spinner />}
      </>
    );
  }

  const { totals, stock, threshold, lowStock, trend } = data;
  const lowRows = stock.filter((s) => lowStock.includes(s.bloodGroup));

  return (
    <>
      <PageHeader icon={FaChartColumn} title="Analytics" subtitle="Your stock and activity at a glance." />

      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-xl-4">
          <StatTile icon={FaDroplet} label="Blood in stock" value={formatMl(totals.availableMl)} hint="All blood groups" />
        </div>
        <div className="col-sm-6 col-xl-4">
          <StatTile
            icon={FaArrowDown}
            label="Received, last 30 days"
            value={formatMl(totals.last30Days.receivedMl)}
            hint={`${totals.last30Days.donations} donation${totals.last30Days.donations === 1 ? '' : 's'}`}
          />
        </div>
        <div className="col-sm-6 col-xl-4">
          <StatTile
            icon={FaArrowUp}
            label="Issued, last 30 days"
            value={formatMl(totals.last30Days.issuedMl)}
            hint={`${totals.last30Days.issues} issue${totals.last30Days.issues === 1 ? '' : 's'} to hospitals`}
          />
        </div>
        <div className="col-sm-6 col-xl-4">
          <StatTile
            icon={FaClipboardList}
            label="Pending blood requests"
            value={totals.pendingRequests}
            hint={<Link to="/requests">Review requests</Link>}
          />
        </div>
        <div className="col-sm-6 col-xl-4">
          <StatTile
            icon={FaCalendarCheck}
            label="Scheduled appointments"
            value={totals.scheduledAppointments}
            hint={<Link to="/appointments">See appointments</Link>}
          />
        </div>
        <div className="col-sm-6 col-xl-4">
          <StatTile
            icon={FaUsers}
            label="Donors"
            value={totals.donors}
            hint={`${totals.hospitals} hospital${totals.hospitals === 1 ? '' : 's'} supplied`}
          />
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-xl-8">
          <div className="card h-100">
            <div className="card-body">
              <h2 className="h5 mb-1">Stock by blood group</h2>
              <p className="small-muted mb-3">
                Millilitres available now. The dashed line is your alert level ({formatMl(threshold)}).
              </p>
              <StockChart stock={stock} threshold={threshold} loading={overview.loading} />
            </div>
          </div>
        </div>
        <div className="col-xl-4">
          <div className="card h-100">
            <div className="card-body">
              <h2 className="h5 mb-3">Low-stock alerts</h2>
              {lowRows.length === 0 ? (
                <p className="text-success mb-0">Every blood group is above {formatMl(threshold)}.</p>
              ) : (
                <ul className="list-unstyled mb-0">
                  {lowRows.map((s) => (
                    <li key={s.bloodGroup} className="d-flex align-items-center gap-2 py-2 border-bottom">
                      <FaTriangleExclamation className="text-warning" aria-label="Low stock" />
                      <BloodChip group={s.bloodGroup} />
                      <span className="ms-auto tabular">
                        {formatMl(s.available)}{' '}
                        <span className="small-muted">({formatMl(threshold - s.available)} short)</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <ThresholdForm threshold={threshold} onSaved={overview.reload} />
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h5 mb-1">Received vs issued, last 30 days</h2>
          <p className="small-muted mb-3">Daily volume in millilitres.</p>
          <TrendChart trend={trend} loading={overview.loading} />
        </div>
      </div>

      <h2 className="h5 mb-3">Blood groups</h2>
      <div className="row g-3 mb-4">
        {stock.map((s) => (
          <div key={s.bloodGroup} className="col-6 col-md-4 col-xl-3">
            <div className="card group-card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <span className="group-name">{s.bloodGroup}</span>
                  {lowStock.includes(s.bloodGroup) && <span className="badge text-bg-warning">Low</span>}
                </div>
                <dl className="row small mb-0 mt-2">
                  <dt className="col-7 fw-normal text-muted">Total in</dt>
                  <dd className="col-5 text-end tabular mb-1">{formatMl(s.totalIn)}</dd>
                  <dt className="col-7 fw-normal text-muted">Total out</dt>
                  <dd className="col-5 text-end tabular mb-1">{formatMl(s.totalOut)}</dd>
                  <dt className="col-7 fw-semibold">Available</dt>
                  <dd className="col-5 text-end tabular fw-semibold mb-0">{formatMl(s.available)}</dd>
                </dl>
              </div>
            </div>
          </div>
        ))}
      </div>

      <h2 className="h5 mb-3">Recent blood transactions</h2>
      <DataTable
        caption="Recent blood transactions"
        columns={recentColumns}
        rows={recent.data?.inventory}
        loading={recent.loading}
        error={recent.error}
        onRetry={recent.reload}
        emptyMessage="No transactions yet."
      />
    </>
  );
}
