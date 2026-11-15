import { toSafeUrl } from '../../utils/format.js';

/** Renders a user-entered website as a link that opens in a new tab (see toSafeUrl). */
export default function WebsiteLink({ url }) {
  const href = toSafeUrl(url);
  if (!href) return <span className="text-muted">—</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {url.trim().replace(/^https?:\/\//i, '')}
    </a>
  );
}
