import {
  FaBuildingNgo,
  FaCalendarCheck,
  FaClipboardList,
  FaDroplet,
  FaGaugeHigh,
  FaHandHoldingMedical,
  FaHospital,
} from 'react-icons/fa6';
import { useSelector } from 'react-redux';
import StockChart from '../../components/charts/StockChart.jsx';
import TrendChart from '../../components/charts/TrendChart.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import StatTile from '../../components/ui/StatTile.jsx';
import { ROLE_LABELS } from '../../constants.js';
import { useApi } from '../../hooks/useApi.js';
import { browserTimeZone, displayName, formatDate, formatMl } from '../../utils/format.js';

const recentColumns = [
  {
    key: 'name',
    header: 'Name',
    render: (u) => (
      <>
        <div className="fw-semibold">{displayName(u)}</div>
        <div className="small-muted">{u.email}</div>
      </>
    ),
  },
  { key: 'role', header: 'Role', render: (u) => <span className="badge text-bg-light border">{ROLE_LABELS[u.role]}</span> },
  { key: 'phone', header: 'Phone' },
  { key: 'createdAt', header: 'Registered', render: (u) => formatDate(u.createdAt) },
];

export default function AdminHome() {
  const user = useSelector((state) => state.auth.user);
  const overview = useApi('/admin/overview', { tz: browserTimeZone() });
  const data = overview.data;

  return (
    <>
      <PageHeader icon={FaGaugeHigh} title={`Welcome Admin ${user.name}`} subtitle="Manage Blood Bank App" />

      {!data ? (
        overview.error ? <div className="alert alert-danger">{overview.error}</div> : <Spinner />
      ) : (
        <>
          <div className="row g-3 mb-4">
            <div className="col-sm-6 col-xl-4">
              <StatTile icon={FaHandHoldingMedical} label="Donors" value={data.counts.donor} />
            </div>
            <div className="col-sm-6 col-xl-4">
              <StatTile icon={FaHospital} label="Hospitals" value={data.counts.hospital} />
            </div>
            <div className="col-sm-6 col-xl-4">
              <StatTile icon={FaBuildingNgo} label="Organisations" value={data.counts.organisation} />
            </div>
            <div className="col-sm-6 col-xl-4">
              <StatTile
                icon={FaDroplet}
                label="Blood in stock"
                value={formatMl(data.totals.availableMl)}
                hint={`Across all organisations · ${data.totals.transactions} transactions`}
              />
            </div>
            <div className="col-sm-6 col-xl-4">
              <StatTile icon={FaClipboardList} label="Pending blood requests" value={data.totals.pendingRequests} />
            </div>
            <div className="col-sm-6 col-xl-4">
              <StatTile icon={FaCalendarCheck} label="Scheduled appointments" value={data.totals.scheduledAppointments} />
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-xl-6">
              <div className="card h-100">
                <div className="card-body">
                  <h2 className="h5 mb-1">Stock by blood group</h2>
                  <p className="small-muted mb-3">Millilitres available across all organisations.</p>
                  <StockChart stock={data.stock} loading={overview.loading} />
                </div>
              </div>
            </div>
            <div className="col-xl-6">
              <h2 className="h5 mb-3">Recent sign-ups</h2>
              <DataTable
                caption="Recent sign-ups"
                columns={recentColumns}
                rows={data.recentUsers}
                emptyMessage="No users yet."
              />
            </div>
          </div>

          {/* Full width: thirty days of paired bars need the room. */}
          <div className="card">
            <div className="card-body">
              <h2 className="h5 mb-1">Received vs issued, last 30 days</h2>
              <p className="small-muted mb-3">Daily volume across all organisations, in millilitres.</p>
              <TrendChart trend={data.trend} loading={overview.loading} />
            </div>
          </div>
        </>
      )}

      <div className="card mt-4">
        <div className="card-body">
          <p className="mb-2">
            The blood bank website project developed by Shivam Pandey is built on the MERN stack, which stands for
            MongoDB, Express.js, React, and Node.js. This technology stack is widely used for building robust and
            scalable web applications.
          </p>
          <p className="mb-0">
            A blood bank website is an online platform that serves as a centralized resource for connecting blood
            donors with recipients in need. It is designed to facilitate the process of blood donation, streamline
            communication, and ensure efficient management of the blood supply.
          </p>
        </div>
      </div>
    </>
  );
}
