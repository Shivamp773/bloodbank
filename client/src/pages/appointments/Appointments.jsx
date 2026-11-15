import { useSelector } from 'react-redux';
import DonorAppointments from './DonorAppointments.jsx';
import OrganisationAppointments from './OrganisationAppointments.jsx';

export default function Appointments() {
  const role = useSelector((state) => state.auth.user.role);
  return role === 'donor' ? <DonorAppointments /> : <OrganisationAppointments />;
}
