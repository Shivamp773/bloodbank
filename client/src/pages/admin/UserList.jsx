import { useState } from 'react';
import { FaBuildingNgo, FaHandHoldingMedical, FaHospital, FaTrash } from 'react-icons/fa6';
import { toast } from 'react-toastify';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import WebsiteLink from '../../components/ui/WebsiteLink.jsx';
import { BloodChip } from '../../components/ui/Badges.jsx';
import { useApi } from '../../hooks/useApi.js';
import API, { getErrorMessage } from '../../services/api.js';
import { displayName, formatDate } from '../../utils/format.js';

const PAGES = {
  donor: { title: 'Donors', icon: FaHandHoldingMedical, nameHeader: 'Donor' },
  hospital: { title: 'Hospitals', icon: FaHospital, nameHeader: 'Hospital' },
  organisation: { title: 'Organisations', icon: FaBuildingNgo, nameHeader: 'Organisation' },
};

/** Admin list of every donor, hospital or organisation, with delete. */
export default function UserList({ role }) {
  const page = PAGES[role];
  const { data, loading, error, reload } = useApi('/admin/users', { role });
  const [target, setTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { data: result } = await API.delete(`/admin/users/${target._id}`);
      toast.success(result.message);
      setTarget(null);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: page.nameHeader,
      render: (u) => (
        <>
          <div className="fw-semibold">{displayName(u)}</div>
          <div className="small-muted">{u.email}</div>
        </>
      ),
    },
    { key: 'phone', header: 'Phone' },
    { key: 'address', header: 'Address' },
    role === 'donor'
      ? { key: 'bloodGroup', header: 'Blood group', render: (u) => <BloodChip group={u.bloodGroup} /> }
      : { key: 'website', header: 'Website', render: (u) => <WebsiteLink url={u.website} /> },
    { key: 'createdAt', header: 'Registered', render: (u) => formatDate(u.createdAt) },
    {
      key: 'actions',
      header: <span className="visually-hidden">Actions</span>,
      className: 'text-end',
      render: (u) => (
        <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setTarget(u)}>
          <FaTrash aria-hidden="true" /> Delete
        </button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        icon={page.icon}
        title={page.title}
        subtitle={data ? `${data.total} registered` : undefined}
      />
      <DataTable
        caption={page.title}
        columns={columns}
        rows={data?.users}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyMessage={`No ${page.title.toLowerCase()} registered yet.`}
      />
      <ConfirmDialog
        show={Boolean(target)}
        title={`Delete ${target ? displayName(target) : ''}?`}
        message="Their account will be removed. Past inventory records are kept for the blood bank's history, and their open requests or appointments are closed."
        confirmLabel="Delete"
        variant="danger"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setTarget(null)}
      />
    </>
  );
}
