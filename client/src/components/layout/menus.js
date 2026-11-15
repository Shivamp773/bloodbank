import {
  FaBuildingNgo,
  FaCalendarCheck,
  FaChartColumn,
  FaClipboardList,
  FaGaugeHigh,
  FaHandHoldingMedical,
  FaHandshake,
  FaHospital,
  FaTruckMedical,
  FaWarehouse,
} from 'react-icons/fa6';

/** Sidebar items per role. `badge` refers to a count in the badges slice. */
export const MENUS = {
  organisation: [
    { to: '/', label: 'Inventory', icon: FaWarehouse, end: true },
    { to: '/donor', label: 'Donors', icon: FaHandHoldingMedical },
    { to: '/hospital', label: 'Hospitals', icon: FaHospital },
    { to: '/requests', label: 'Blood Requests', icon: FaClipboardList, badge: 'requests' },
    { to: '/appointments', label: 'Appointments', icon: FaCalendarCheck, badge: 'appointments' },
    { to: '/analytics', label: 'Analytics', icon: FaChartColumn },
  ],
  donor: [
    { to: '/organisation', label: 'Organisations', icon: FaBuildingNgo },
    { to: '/donation', label: 'My Donations', icon: FaHandshake },
    { to: '/appointments', label: 'Appointments', icon: FaCalendarCheck, badge: 'appointments' },
  ],
  hospital: [
    { to: '/organisation', label: 'Organisations', icon: FaBuildingNgo },
    { to: '/consumer', label: 'Received Blood', icon: FaTruckMedical },
    { to: '/requests', label: 'Blood Requests', icon: FaClipboardList, badge: 'requests' },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: FaGaugeHigh },
    { to: '/donor-list', label: 'Donors', icon: FaHandHoldingMedical },
    { to: '/hospital-list', label: 'Hospitals', icon: FaHospital },
    { to: '/org-list', label: 'Organisations', icon: FaBuildingNgo },
  ],
};
