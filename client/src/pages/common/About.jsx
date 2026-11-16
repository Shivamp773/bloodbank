import { FaCircleInfo, FaEnvelope, FaGithub, FaHeart } from 'react-icons/fa6';
import PageHeader from '../../components/ui/PageHeader.jsx';

const FEATURES = [
  ['Inventory', 'Organisations record blood received from donors and issued to hospitals, with stock checks.'],
  ['Blood requests', 'Hospitals request blood from an organisation, which approves or rejects it.'],
  ['Donation appointments', 'Donors book a donation slot; the 90-day gap between donations is enforced.'],
  ['Analytics', 'Stock by blood group, 30-day trends and low-stock alerts for each organisation.'],
  ['Administration', 'Admins see system-wide numbers and manage donors, hospitals and organisations.'],
];

export default function About() {
  return (
    <>
      <PageHeader icon={FaCircleInfo} title="About" />
      <div className="card">
        <div className="card-body p-4">
          <h2 className="h4">
            Made with <FaHeart className="text-primary" aria-label="love" /> by Shivam Pandey
          </h2>
          <p>
            The blood bank website project developed by Shivam Pandey is built on the MERN stack, which stands for
            MongoDB, Express.js, React, and Node.js. This technology stack is widely used for building robust and
            scalable web applications.
          </p>
          <p>
            A blood bank website is an online platform that serves as a centralized resource for connecting blood
            donors with recipients in need. It is designed to facilitate the process of blood donation, streamline
            communication, and ensure efficient management of the blood supply. The website acts as a bridge between
            donors and healthcare institutions, providing valuable information, online registration, scheduling, and
            other essential features.
          </p>

          <h3 className="h5 mt-4">Features</h3>
          <ul>
            {FEATURES.map(([name, description]) => (
              <li key={name}>
                <strong>{name}:</strong> {description}
              </li>
            ))}
          </ul>

          <h3 className="h5 mt-4">Contacts</h3>
          <p className="mb-2">
            <FaEnvelope className="text-primary me-2" aria-hidden="true" />
            <a href="mailto:spandey.7773@gmail.com">Gmail: spandey.7773@gmail.com</a>
          </p>
          <p className="mb-0">
            <FaGithub className="text-primary me-2" aria-hidden="true" />
            <a href="https://github.com/Shivamp773" target="_blank" rel="noopener noreferrer">
              GitHub: Shivamp773
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
