import { FaCalendarCheck, FaDroplet, FaHandshake, FaHeart } from 'react-icons/fa6';
import { Link } from 'react-router';
import DataTable from '../../components/ui/DataTable.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import StatTile from '../../components/ui/StatTile.jsx';
import { BloodChip } from '../../components/ui/Badges.jsx';
import { useApi } from '../../hooks/useApi.js';
import { displayName, formatDate, formatDateTime, formatMl } from '../../utils/format.js';

const columns = [
  { key: 'createdAt', header: 'Date', render: (r) => formatDateTime(r.createdAt) },
  { key: 'bloodGroup', header: 'Blood group', render: (r) => <BloodChip group={r.bloodGroup} /> },
  { key: 'quantity', header: 'Quantity', className: 'text-end tabular', render: (r) => formatMl(r.quantity) },
  { key: 'organisation', header: 'Organisation', render: (r) => displayName(r.organisation) },
  {
    key: 'source',
    header: 'Booked via',
    render: (r) => (r.appointment ? <span className="badge text-bg-light border">Appointment</span> : 'Walk-in'),
  },
];

export default function Donations() {
  const history = useApi('/inventory/history');
  const eligibility = useApi('/appointments/eligibility');
  const stats = eligibility.data?.stats;

  return (
    <>
      <PageHeader icon={FaHandshake} title="My donations" subtitle="Every donation recorded by a blood bank." />

      {eligibility.data && (
        <div className="row g-3 mb-4">
          <div className="col-sm-6 col-xl-3">
            <StatTile icon={FaHandshake} label="Donations" value={stats.donations} />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatTile icon={FaDroplet} label="Total donated" value={formatMl(stats.totalMl)} />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatTile
              icon={FaHeart}
              label="Patients helped"
              value={`up to ${stats.donations * 3}`}
              hint="One donation can help up to three patients."
            />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatTile
              icon={FaCalendarCheck}
              label="Next eligible"
              value={eligibility.data.eligible ? 'Now' : formatDate(eligibility.data.nextEligibleAt)}
              hint={<Link to="/appointments">Book an appointment</Link>}
            />
          </div>
        </div>
      )}

      <DataTable
        caption="My donations"
        columns={columns}
        rows={history.data?.inventory}
        loading={history.loading}
        error={history.error}
        onRetry={history.reload}
        emptyMessage="No donations recorded yet."
      />
    </>
  );
}
