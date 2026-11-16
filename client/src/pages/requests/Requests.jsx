import { useSelector } from 'react-redux';
import HospitalRequests from './HospitalRequests.jsx';
import OrganisationRequests from './OrganisationRequests.jsx';

export default function Requests() {
  const role = useSelector((state) => state.auth.user.role);
  return role === 'hospital' ? <HospitalRequests /> : <OrganisationRequests />;
}
