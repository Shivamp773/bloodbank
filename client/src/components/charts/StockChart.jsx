import { useState } from 'react';
import { FaTriangleExclamation } from 'react-icons/fa6';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartTooltip from './ChartTooltip.jsx';
import { CHART, formatTick, niceTicks } from './chartTheme.js';
import { formatMl } from '../../utils/format.js';

/** X-axis label with a text "Low" marker under groups below the alert level (never colour alone). */
function GroupTick({ x, y, payload, lowGroups }) {
  const low = lowGroups.has(payload.value);
  return (
    <g transform={`translate(${x},${y})`}>
      <text dy={14} textAnchor="middle" fill={CHART.textPrimary} fontSize={12} fontWeight={600}>
        {payload.value}
      </text>
      {low && (
        <text dy={29} textAnchor="middle" fill={CHART.warningText} fontSize={11}>
          Low
        </text>
      )}
    </g>
  );
}

/**
 * Available ml per blood group: one series, so one colour and no legend box (the card title names it).
 * `threshold` (optional) draws the low-stock alert line.
 */
export default function StockChart({ stock, threshold, loading = false }) {
  const [showTable, setShowTable] = useState(false);
  const lowGroups = new Set(
    threshold == null ? [] : stock.filter((s) => s.available < threshold).map((s) => s.bloodGroup),
  );
  const ticks = niceTicks(Math.max(threshold ?? 0, ...stock.map((s) => s.available)));

  return (
    <div style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
      <ResponsiveContainer width="100%" height={290}>
        <BarChart data={stock} margin={{ top: 16, right: threshold == null ? 12 : 44, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis
            dataKey="bloodGroup"
            tickLine={false}
            axisLine={{ stroke: CHART.axis }}
            height={threshold == null ? 28 : 40}
            interval={0}
            tick={<GroupTick lowGroups={lowGroups} />}
          />
          <YAxis
            ticks={ticks}
            domain={[0, ticks.at(-1)]}
            tickFormatter={formatTick}
            tickLine={false}
            axisLine={false}
            width={52}
            tick={{ fill: CHART.textMuted, fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: CHART.hoverBand }}
            content={
              <ChartTooltip
                footer={(payload) =>
                  lowGroups.has(payload[0]?.payload.bloodGroup) && (
                    <div className="chart-tooltip-note">
                      <FaTriangleExclamation aria-hidden="true" /> Below the alert level
                    </div>
                  )
                }
              />
            }
          />
          {threshold != null && (
            // Dashed on purpose: it marks a threshold, not a gridline. The label sits in the right
            // margin, outside the plot, so it can never collide with a bar.
            <ReferenceLine
              y={threshold}
              stroke={CHART.textSecondary}
              strokeDasharray="4 4"
              label={{ value: 'Alert', position: 'right', fill: CHART.textSecondary, fontSize: 12 }}
            />
          )}
          <Bar
            dataKey="available"
            name="Available"
            fill={CHART.series1}
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
            activeBar={CHART.activeBar}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>

      <button type="button" className="btn btn-link btn-sm px-0" onClick={() => setShowTable(!showTable)}>
        {showTable ? 'Hide data table' : 'Show data table'}
      </button>
      {showTable && (
        <div className="table-responsive">
          <table className="table table-sm mb-0">
            <caption className="visually-hidden">Stock by blood group</caption>
            <thead>
              <tr>
                <th scope="col">Blood group</th>
                <th scope="col" className="text-end">Received</th>
                <th scope="col" className="text-end">Issued</th>
                <th scope="col" className="text-end">Available</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((s) => (
                <tr key={s.bloodGroup}>
                  <th scope="row">
                    {s.bloodGroup}
                    {lowGroups.has(s.bloodGroup) && <span className="badge text-bg-warning ms-2">Low</span>}
                  </th>
                  <td className="text-end tabular">{formatMl(s.totalIn)}</td>
                  <td className="text-end tabular">{formatMl(s.totalOut)}</td>
                  <td className="text-end tabular">{formatMl(s.available)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
