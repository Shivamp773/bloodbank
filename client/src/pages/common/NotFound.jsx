import { BiDonateBlood } from 'react-icons/bi';
import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div className="loader-page text-center px-3">
      <div>
        <BiDonateBlood className="text-primary mb-3" size={56} aria-hidden="true" />
        <h1 className="h3">Page not found</h1>
        <p className="text-muted">The page you are looking for doesn&apos;t exist.</p>
        <Link to="/" className="btn btn-primary">
          Go to the home page
        </Link>
      </div>
    </div>
  );
}
