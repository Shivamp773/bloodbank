import { useState } from 'react';
import dayjs from 'dayjs';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartTooltip from './ChartTooltip.jsx';
import { CHART, formatTick, niceTicks } from './chartTheme.js';
import { formatMl } from '../../utils/format.js';

const SERIES = [
  { key: 'in', name: 'Received (IN)', color: CHART.series1 },
  { key: 'out', name: 'Issued (OUT)', color: CHART.series2 },
];

/** Daily IN vs OUT volume. Two series: a legend with totals, a shared tooltip and a table view. */
export default function TrendChart({ trend, loading = false }) {
  const [showTable, setShowTable] = useState(false);
  const totals = Object.fromEntries(SERIES.map(({ key }) => [key, trend.reduce((sum, day) => sum + day[key], 0)]));
  const activeDays = trend.filter((day) => day.in || day.out);
  const ticks = niceTicks(Math.max(...trend.flatMap((day) => [day.in, day.out])));

  return (
    <div style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
      <ul className="chart-legend" aria-label="Legend">
        {SERIES.map(({ key, name, color }) => (
          <li key={key}>
            <span className="chart-swatch" style={{ background: color }} aria-hidden="true" />
            {name} <strong className="ms-1">{formatMl(totals[key])}</strong>
          </li>
        ))}
      </ul>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={trend} barGap={2} barCategoryGap="12%" margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => dayjs(date).format('D MMM')}
            interval="preserveStartEnd"
            minTickGap={28}
            tickLine={false}
            axisLine={{ stroke: CHART.axis }}
            tick={{ fill: CHART.textMuted, fontSize: 12 }}
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
            content={<ChartTooltip labelFormatter={(date) => dayjs(date).format('ddd, D MMM YYYY')} />}
          />
          {SERIES.map(({ key, name, color }) => (
            <Bar
              key={key}
              dataKey={key}
              name={name}
              fill={color}
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
              activeBar={CHART.activeBar}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      <button type="button" className="btn btn-link btn-sm px-0" onClick={() => setShowTable(!showTable)}>
        {showTable ? 'Hide data table' : 'Show data table'}
      </button>
      {showTable && (
        <div className="table-responsive">
          <table className="table table-sm mb-0">
            <caption className="visually-hidden">Daily blood received and issued</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col" className="text-end">Received</th>
                <th scope="col" className="text-end">Issued</th>
              </tr>
            </thead>
            <tbody>
              {activeDays.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-muted">
                    No activity in the last 30 days.
                  </td>
                </tr>
              )}
              {activeDays.map((day) => (
                <tr key={day.date}>
                  <th scope="row" className="fw-normal">
                    {dayjs(day.date).format('ddd, D MMM YYYY')}
                  </th>
                  <td className="text-end tabular">{formatMl(day.in)}</td>
                  <td className="text-end tabular">{formatMl(day.out)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small-muted mt-1 mb-0">Days without any activity are left out.</p>
        </div>
      )}
    </div>
  );
}
