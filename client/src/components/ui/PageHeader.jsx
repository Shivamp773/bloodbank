export default function PageHeader({ icon: Icon, title, subtitle, actions }) {
  return (
    <div className="page-header d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
      <div>
        <h1>
          {Icon && <Icon aria-hidden="true" />}
          {title}
        </h1>
        {subtitle && <p className="text-muted mb-0 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="d-flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
