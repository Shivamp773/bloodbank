import { BiDonateBlood } from 'react-icons/bi';

/**
 * Two-column layout for Login/Register: a visual on the left (large screens), the form on the right.
 * Pass `aside` for a custom panel, or `banner` for a picture. The picture is never cropped;
 * `bannerBackground` fills the space around it with the image's edge colours.
 */
export default function AuthLayout({ banner, bannerAlt, bannerBackground, aside, children }) {
  return (
    <div className="auth-page">
      {aside ?? (
        <div className="auth-banner" style={{ background: bannerBackground }}>
          <img src={banner} alt={bannerAlt} />
        </div>
      )}
      <div className="auth-panel">
        <div className="auth-form">
          <div className="d-flex align-items-center gap-2 mb-4 fs-4 fw-bold">
            <BiDonateBlood className="text-primary" size={34} aria-hidden="true" />
            Blood Bank
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
