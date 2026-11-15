import { FaHandHoldingMedical } from 'react-icons/fa6';
import DataTable from '../../components/ui/DataTable.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { BloodChip } from '../../components/ui/Badges.jsx';
import { useApi } from '../../hooks/useApi.js';
import { displayName, formatDate, formatMl } from '../../utils/format.js';

const columns = [
  {
    key: 'name',
    header: 'Donor',
    render: (d) => (
      <>
        <div className="fw-semibold">{displayName(d)}</div>
        <div className="small-muted">{d.email}</div>
      </>
    ),
  },
  { key: 'phone', header: 'Phone' },
  { key: 'address', header: 'Address' },
  { key: 'bloodGroup', header: 'Blood group', render: (d) => <BloodChip group={d.bloodGroup} /> },
  { key: 'transactions', header: 'Donations', className: 'text-end tabular' },
  { key: 'totalMl', header: 'Total donated', className: 'text-end tabular', render: (d) => formatMl(d.totalMl) },
  { key: 'lastAt', header: 'Last donation', render: (d) => formatDate(d.lastAt) },
];

export default function Donors() {
  const { data, loading, error, reload } = useApi('/inventory/donors');
  return (
    <>
      <PageHeader icon={FaHandHoldingMedical} title="Donors" subtitle="Everyone who has donated blood to your organisation." />
      <DataTable
        caption="Donors"
        columns={columns}
        rows={data?.donors}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyMessage="No donations recorded yet."
      />
    </>
  );
}
