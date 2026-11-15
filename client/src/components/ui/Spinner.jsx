export default function Spinner({ label = 'Loading…', fullPage = false }) {
  return (
    <div className={fullPage ? 'loader-page' : 'loader-inline'} role="status" aria-live="polite">
      <div className="loader" aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </div>
  );
}
