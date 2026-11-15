import { useEffect, useState } from 'react';
import { FaMagnifyingGlass, FaPlus, FaTriangleExclamation, FaWarehouse } from 'react-icons/fa6';
import { Link } from 'react-router';
import InventoryModal from '../../components/inventory/InventoryModal.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { BloodChip, TypeBadge } from '../../components/ui/Badges.jsx';
import { BLOOD_GROUPS } from '../../constants.js';
import { useApi } from '../../hooks/useApi.js';
import { displayName, formatDateTime, formatMl } from '../../utils/format.js';

const columns = [
  { key: 'bloodGroup', header: 'Blood group', render: (r) => <BloodChip group={r.bloodGroup} /> },
  { key: 'inventoryType', header: 'Type', render: (r) => <TypeBadge type={r.inventoryType} /> },
  { key: 'quantity', header: 'Quantity', className: 'text-end tabular', render: (r) => formatMl(r.quantity) },
  {
    key: 'party',
    header: 'Donor / hospital',
    render: (r) => {
      const party = r.inventoryType === 'in' ? r.donor : r.hospital;
      return (
        <>
          <div className="fw-semibold">{displayName(party)}</div>
          <div className="small-muted">{r.email}</div>
        </>
      );
    },
  },
  { key: 'createdAt', header: 'Date & time', render: (r) => formatDateTime(r.createdAt) },
];

export default function Inventory() {
  const [filters, setFilters] = useState({ page: 1, limit: 10, bloodGroup: '', inventoryType: '', search: '' });
  const [searchText, setSearchText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const records = useApi('/inventory', filters);
  const stock = useApi('/analytics/blood-groups');

  // Search as you type, without a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      const search = searchText.trim();
      setFilters((current) => (current.search === search ? current : { ...current, search, page: 1 }));
    }, 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  const setFilter = (field) => (event) => setFilters({ ...filters, [field]: event.target.value, page: 1 });
  const hasFilters = Boolean(filters.bloodGroup || filters.inventoryType || filters.search);
  const lowStock = stock.data?.lowStock ?? [];
  const pagination = records.data?.pagination;

  return (
    <>
      <PageHeader
        icon={FaWarehouse}
        title="Inventory"
        subtitle="Blood received from donors and issued to hospitals."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setShowModal(true)}>
            <FaPlus aria-hidden="true" /> Add record
          </button>
        }
      />

      {lowStock.length > 0 && (
        <div className="alert alert-warning d-flex align-items-center gap-2" role="status">
          <FaTriangleExclamation aria-hidden="true" />
          <div>
            Low stock: <strong>{lowStock.join(', ')}</strong> {lowStock.length === 1 ? 'is' : 'are'} below{' '}
            {formatMl(stock.data.threshold)}. <Link to="/analytics">Open analytics</Link>
          </div>
        </div>
      )}

      <div className="row g-2 mb-3">
        <div className="col-sm-6 col-lg-3">
          <select
            className="form-select"
            aria-label="Filter by blood group"
            value={filters.bloodGroup}
            onChange={setFilter('bloodGroup')}
          >
            <option value="">All blood groups</option>
            {BLOOD_GROUPS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>
        <div className="col-sm-6 col-lg-3">
          <select
            className="form-select"
            aria-label="Filter by type"
            value={filters.inventoryType}
            onChange={setFilter('inventoryType')}
          >
            <option value="">IN and OUT</option>
            <option value="in">IN only</option>
            <option value="out">OUT only</option>
          </select>
        </div>
        <div className="col-lg-6">
          <div className="input-group">
            <span className="input-group-text bg-white">
              <FaMagnifyingGlass aria-hidden="true" />
            </span>
            <input
              type="search"
              className="form-control"
              placeholder="Search by email"
              aria-label="Search by email"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </div>
        </div>
      </div>

      <DataTable
        caption="Inventory records"
        columns={columns}
        rows={records.data?.inventory}
        loading={records.loading}
        error={records.error}
        onRetry={records.reload}
        emptyMessage={hasFilters ? 'No records match these filters.' : 'No records yet. Use "Add record" to log the first donation.'}
        footer={
          pagination && (
            <Pagination
              page={pagination.page}
              pages={pagination.pages}
              total={pagination.total}
              onChange={(page) => setFilters({ ...filters, page })}
            />
          )
        }
      />

      <InventoryModal
        show={showModal}
        stock={stock.data?.bloodGroupData}
        onClose={() => setShowModal(false)}
        onSaved={() => {
          setShowModal(false);
          records.reload();
          stock.reload();
        }}
      />
    </>
  );
}
