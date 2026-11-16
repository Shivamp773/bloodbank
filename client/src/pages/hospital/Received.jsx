import { FaTruckMedical } from 'react-icons/fa6';
import DataTable from '../../components/ui/DataTable.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { BloodChip } from '../../components/ui/Badges.jsx';
import { useApi } from '../../hooks/useApi.js';
import { displayName, formatDateTime, formatMl } from '../../utils/format.js';

// v1 showed a "Website" column here that was always empty; it now shows the supplying organisation.
const columns = [
  { key: 'createdAt', header: 'Received', render: (r) => formatDateTime(r.createdAt) },
  { key: 'bloodGroup', header: 'Blood group', render: (r) => <BloodChip group={r.bloodGroup} /> },
  { key: 'quantity', header: 'Quantity', className: 'text-end tabular', render: (r) => formatMl(r.quantity) },
  {
    key: 'organisation',
    header: 'From',
    render: (r) => (
      <>
        <div className="fw-semibold">{displayName(r.organisation)}</div>
        <div className="small-muted">{r.organisation?.phone}</div>
      </>
    ),
  },
  {
    key: 'source',
    header: 'Source',
    render: (r) => (r.request ? <span className="badge text-bg-light border">Your request</span> : 'Direct issue'),
  },
];

export default function Received() {
  const { data, loading, error, reload } = useApi('/inventory/history');
  return (
    <>
      <PageHeader
        icon={FaTruckMedical}
        title="Received blood"
        subtitle="Blood issued to your hospital by blood bank organisations."
      />
      <DataTable
        caption="Received blood"
        columns={columns}
        rows={data?.inventory}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyMessage="No blood received yet."
      />
    </>
  );
}
