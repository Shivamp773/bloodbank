import { FaBuildingNgo, FaHandHoldingDroplet, FaHospital } from 'react-icons/fa6';

const ROLES = [
  {
    icon: FaHandHoldingDroplet,
    title: 'Donors',
    text: 'Book donation appointments and see when you can give again.',
  },
  {
    icon: FaHospital,
    title: 'Hospitals',
    text: 'Request blood from blood banks and follow every request.',
  },
  {
    icon: FaBuildingNgo,
    title: 'Blood banks',
    text: 'Manage stock, approve requests and spot shortages early.',
  },
];

/** Left-hand brand panel of the Register page (large screens only). */
export default function RegisterAside() {
  return (
    <aside className="auth-banner auth-aside">
      <div className="auth-aside-content">
        <svg className="auth-aside-mark" viewBox="0 0 64 64" aria-hidden="true">
          <path fill="#fff" d="M32 4C24 16 12 28 12 40a20 20 0 0 0 40 0C52 28 40 16 32 4z" />
          <path fill="#b3122e" d="M28 32h8v6h6v8h-6v6h-8v-6h-6v-8h6z" />
        </svg>
        <h2>One donation can help up to three patients.</h2>
        <p className="auth-aside-lead">
          Join Blood Bank to donate, request or manage blood, all in one place.
        </p>
        <ul className="auth-features">
          {ROLES.map(({ icon: Icon, title, text }) => (
            <li key={title}>
              <span className="auth-feature-icon" aria-hidden="true">
                <Icon />
              </span>
              <span>
                <strong>{title}</strong>
                {text}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
