// Chart math, ported from pdfcn's graph.utils.ts (same margins, tick and arc logic).
export const MARGINS = { axisBottom: 24, axisLeft: 40, pieBottom: 10, pieLeft: 10, right: 10, top: 10 };

/** [{label,value,color?}] or [{name,data,color?}] -> always [{name,data,color?}] */
export const normalizeData = (data) => (!data.length ? [] : "label" in data[0] && "value" in data[0] ? [{ name: "Series 1", data }] : data);

export const fmt = (v) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : Math.abs(v) >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : Number.isInteger(v) ? String(v) : v.toFixed(1));
export const truncate = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

// "nice" axis: round step (1, 1.5, 2, 2.5, 3, 4, 5, 6, 8 x 10^k) and a max that is an exact multiple of it
// (pdfcn divides min..max into `count` equal parts, which gives ticks like 56.7 / 113.4 / 170.1)
const niceStep = (raw) => { const p = 10 ** Math.floor(Math.log10(raw)); return p * ([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((m) => m * p >= raw * 0.999) ?? 10); };

export const layout = (series, width, height, pie, tickCount, extraTop = 0) => {
  const mL = pie ? MARGINS.pieLeft : MARGINS.axisLeft, mB = pie ? MARGINS.pieBottom : MARGINS.axisBottom;
  const values = series.flatMap((s) => s.data.map((d) => d.value));
  const yMin = Math.min(0, ...values), rawMax = Math.max(...values, 1), step = niceStep(((rawMax - yMin) * 1.04) / Math.max(tickCount - 1, 1)), yMax = yMin + step * Math.max(tickCount - 1, 1);
  return { svgW: width, svgH: height, x: mL, y: MARGINS.top + extraTop, w: width - mL - MARGINS.right, h: height - MARGINS.top - extraTop - mB, yMin, yMax, yTicks: Array.from({ length: Math.max(tickCount, 2) }, (_, i) => Math.round((yMin + i * step) * 100) / 100), xLabels: series[0]?.data.map((d) => d.label) ?? [] };
};

const polar = (cx, cy, r, deg) => { const a = ((deg - 90) * Math.PI) / 180; return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }; };
export const arc = (cx, cy, r, start, end, inner = 0) => {
  const e = Math.min(end, start + 359.999), large = e - start > 180 ? 1 : 0, s = polar(cx, cy, r, e), t = polar(cx, cy, r, start);
  if (!inner) return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${t.x} ${t.y} Z`;
  const si = polar(cx, cy, inner, e), ti = polar(cx, cy, inner, start);
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${t.x} ${t.y} L ${ti.x} ${ti.y} A ${inner} ${inner} 0 ${large} 1 ${si.x} ${si.y} Z`;
};
export { polar };

/** Catmull-Rom -> cubic bezier */
export const smooth = (pts, tension = 0.4) => {
  if (pts.length < 2) return "";
  if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
    d += ` C ${p1.x + (p2.x - p0.x) * tension} ${p1.y + (p2.y - p0.y) * tension} ${p2.x - (p3.x - p1.x) * tension} ${p2.y - (p3.y - p1.y) * tension} ${p2.x} ${p2.y}`;
  }
  return d;
};

export const PALETTE = ["primary", "info", "success", "warning", "destructive", "#8B5CF6", "#F97316", "#14B8A6"];
