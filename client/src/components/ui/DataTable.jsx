import Spinner from './Spinner.jsx';

/**
 * One table component for every list in the app, with loading, error and empty states.
 * `columns`: [{ key, header, render?(row), className? }]
 */
export default function DataTable({
  columns,
  rows,
  loading = false,
  error = null,
  onRetry,
  emptyMessage = 'Nothing to show yet.',
  caption,
  footer,
  rowKey = (row) => row._id,
}) {
  const hasRows = Array.isArray(rows) && rows.length > 0;

  let body;
  if (loading && !hasRows) {
    body = (
      <tr>
        <td colSpan={columns.length}>
          <Spinner />
        </td>
      </tr>
    );
  } else if (error && !hasRows) {
    body = (
      <tr>
        <td colSpan={columns.length} className="text-center py-4">
          <span className="text-danger">{error}</span>
          {onRetry && (
            <button type="button" className="btn btn-link btn-sm" onClick={onRetry}>
              Try again
            </button>
          )}
        </td>
      </tr>
    );
  } else if (!hasRows) {
    body = (
      <tr>
        <td colSpan={columns.length} className="text-center text-muted py-5">
          {emptyMessage}
        </td>
      </tr>
    );
  } else {
    body = rows.map((row) => (
      <tr key={rowKey(row)}>
        {columns.map((column) => (
          <td key={column.key} className={column.className}>
            {column.render ? column.render(row) : (row[column.key] ?? '—')}
          </td>
        ))}
      </tr>
    ));
  }

  return (
    <div className="card table-card">
      <div className="table-responsive">
        <table className="table table-hover align-middle" aria-busy={loading}>
          {caption && <caption className="visually-hidden">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className={column.className}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{body}</tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}
