import { FaBuildingNgo } from 'react-icons/fa6';
import { useSelector } from 'react-redux';
import DataTable from '../../components/ui/DataTable.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import WebsiteLink from '../../components/ui/WebsiteLink.jsx';
import { useApi } from '../../hooks/useApi.js';
import { formatDate, formatMl } from '../../utils/format.js';

/** Donors see the organisations they gave blood to; hospitals see the organisations that supplied them. */
export default function Organisations() {
  const role = useSelector((state) => state.auth.user.role);
  const { data, loading, error, reload } = useApi('/inventory/organisations');
  const isDonor = role === 'donor';

  const columns = [
    {
      key: 'organisationName',
      header: 'Organisation',
      render: (o) => (
        <>
          <div className="fw-semibold">{o.organisationName}</div>
          <div className="small-muted">{o.email}</div>
        </>
      ),
    },
    { key: 'phone', header: 'Phone' },
    { key: 'address', header: 'Address' },
    { key: 'website', header: 'Website', render: (o) => <WebsiteLink url={o.website} /> },
    { key: 'transactions', header: isDonor ? 'Donations' : 'Supplies', className: 'text-end tabular' },
    {
      key: 'totalMl',
      header: isDonor ? 'Total donated' : 'Total received',
      className: 'text-end tabular',
      render: (o) => formatMl(o.totalMl),
    },
    { key: 'lastAt', header: isDonor ? 'Last donation' : 'Last supply', render: (o) => formatDate(o.lastAt) },
  ];

  return (
    <>
      <PageHeader
        icon={FaBuildingNgo}
        title="Organisations"
        subtitle={isDonor ? 'Blood banks you have donated to.' : 'Blood banks that have supplied your hospital.'}
      />
      <DataTable
        caption="Organisations"
        columns={columns}
        rows={data?.organisations}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyMessage={
          isDonor
            ? 'No donations yet. Book an appointment to make your first one.'
            : 'No supplies yet. Send a blood request to an organisation.'
        }
      />
    </>
  );
}
