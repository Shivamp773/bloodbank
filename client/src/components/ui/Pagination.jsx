import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

export default function Pagination({ page, pages, total, onChange }) {
  if (!total) return null;
  return (
    <div className="card-footer bg-white d-flex flex-wrap align-items-center justify-content-between gap-2">
      <span className="small-muted">
        Page {page} of {pages} · {total} record{total === 1 ? '' : 's'}
      </span>
      <div className="btn-group" role="group" aria-label="Pagination">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
        >
          <FaChevronLeft aria-hidden="true" /> Previous
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => onChange(page + 1)}
          disabled={page >= pages}
        >
          Next <FaChevronRight aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
