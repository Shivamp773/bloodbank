import { FaHospital } from 'react-icons/fa6';
import DataTable from '../../components/ui/DataTable.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import WebsiteLink from '../../components/ui/WebsiteLink.jsx';
import { useApi } from '../../hooks/useApi.js';
import { displayName, formatDate, formatMl } from '../../utils/format.js';

const columns = [
  {
    key: 'name',
    header: 'Hospital',
    render: (h) => (
      <>
        <div className="fw-semibold">{displayName(h)}</div>
        <div className="small-muted">{h.email}</div>
      </>
    ),
  },
  { key: 'phone', header: 'Phone' },
  { key: 'address', header: 'Address' },
  { key: 'website', header: 'Website', render: (h) => <WebsiteLink url={h.website} /> },
  { key: 'transactions', header: 'Supplies', className: 'text-end tabular' },
  { key: 'totalMl', header: 'Total supplied', className: 'text-end tabular', render: (h) => formatMl(h.totalMl) },
  { key: 'lastAt', header: 'Last supplied', render: (h) => formatDate(h.lastAt) },
];

export default function Hospitals() {
  const { data, loading, error, reload } = useApi('/inventory/hospitals');
  return (
    <>
      <PageHeader icon={FaHospital} title="Hospitals" subtitle="Hospitals your organisation has supplied with blood." />
      <DataTable
        caption="Hospitals"
        columns={columns}
        rows={data?.hospitals}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyMessage="You haven't issued blood to any hospital yet."
      />
    </>
  );
}
