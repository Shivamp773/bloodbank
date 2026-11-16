import { formatMl } from '../../utils/format.js';

/** Shared tooltip: every series at the hovered position, value first, with a short line key per series. */
export default function ChartTooltip({ active, payload, label, labelFormatter, footer }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip" role="status">
      <div className="chart-tooltip-label">{labelFormatter ? labelFormatter(label) : label}</div>
      {payload.map((item) => (
        <div key={item.dataKey} className="chart-tooltip-row">
          <span className="chart-line-key" style={{ background: item.color }} aria-hidden="true" />
          <strong>{formatMl(item.value)}</strong>
          <span className="chart-tooltip-name">{item.name}</span>
        </div>
      ))}
      {footer?.(payload)}
    </div>
  );
}
