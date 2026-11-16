/**
 * Chart colours and chrome. The two series colours were checked for colour-blind separation
 * (ΔE 24.7 in OKLab under protanopia/deuteranopia simulation) and are ≥ 3:1 against the white card.
 * Brand crimson stays a UI accent; green/red are reserved for status, so they are not series colours.
 * Bars are drawn without animation: Recharts replays the grow-in animation from zero on every resize,
 * which made bars flicker (and vanish from screenshots).
 */
export const CHART = {
  series1: '#2a78d6',
  series2: '#eb6834',
  activeBar: { fillOpacity: 0.8 }, // the hovered bar lifts slightly
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  textPrimary: '#0b0b0b',
  textSecondary: '#52514e',
  textMuted: '#898781',
  warningText: '#664d03',
  hoverBand: 'rgba(11, 11, 11, 0.04)',
};

/** Y-axis ticks: full numbers below 10,000, compact above (10K, 20K). */
export const formatTick = (value) =>
  value >= 10_000 ? `${Math.round(value / 1000).toLocaleString()}K` : value.toLocaleString();

/**
 * Evenly spaced round ticks from 0 that cover `max` in at most `maxIntervals` steps,
 * e.g. max 1,800 → 0, 500, 1,000, 1,500, 2,000 (instead of Recharts' 0, 450, 900, …).
 */
export function niceTicks(max, maxIntervals = 4) {
  if (!(max > 0)) return [0, 500];
  const rough = max / maxIntervals;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(1, [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough));
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step);
}
