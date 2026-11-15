export default function StatTile({ label, value, hint, icon: Icon }) {
  return (
    <div className="card stat-tile h-100">
      <div className="card-body d-flex align-items-start gap-3">
        {Icon && (
          <div className="stat-icon" aria-hidden="true">
            <Icon />
          </div>
        )}
        <div className="min-w-0">
          <div className="stat-label">{label}</div>
          <div className="stat-value">{value}</div>
          {hint && <div className="small-muted">{hint}</div>}
        </div>
      </div>
    </div>
  );
}
