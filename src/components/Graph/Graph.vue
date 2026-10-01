<script setup>
import { computed } from "vue";
import { cn, rest, color as resolve } from "../../lib/ui.js";
import { normalizeData, layout as makeLayout, fmt, truncate, arc, polar, smooth, PALETTE } from "./graph.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  variant: { type: String, default: "bar" }, // bar | horizontal-bar | line | area | pie | donut
  data: { type: Array, required: true }, // [{ label, value, color? }] or [{ name, color?, data: [{ label, value, color? }] }]
  title: String,
  subtitle: String,
  xLabel: String,
  yLabel: String,
  width: { type: Number, default: 420 }, // pt
  height: { type: Number, default: 260 },
  fullWidth: Boolean, // fill an A4 page with 30pt margins (minus the paddings below)
  containerPadding: { type: Number, default: 0 },
  wrapperPadding: { type: Number, default: 0 },
  colors: Array, // palette override (theme tokens or CSS colors)
  showValues: Boolean,
  showGrid: { type: Boolean, default: true },
  legend: { type: String, default: "bottom" }, // bottom | right | none
  centerLabel: String, // donut
  showDots: { type: Boolean, default: true },
  smooth: Boolean,
  yTicks: { type: Number, default: 5 },
  noWrap: { type: Boolean, default: true },
});

const pie = computed(() => props.variant === "pie" || props.variant === "donut");
const W = computed(() => (props.fullWidth ? Math.max(Math.floor(595 - 60 - props.containerPadding * 2 - props.wrapperPadding * 2), 100) : props.width));
const series = computed(() => normalizeData(props.data));
const L = computed(() => makeLayout(series.value, W.value, props.height, pie.value, props.yTicks, !pie.value && props.yLabel ? 12 : 0)); // yLabel gets its own row above the top tick label
const palette = computed(() => (props.colors?.length ? props.colors : PALETTE).map(resolve));
const pal = (i) => palette.value[i % palette.value.length];
const MUTED = "var(--muted-foreground)", FG = "var(--foreground)", GRID = "var(--border)";

// ---- geometry; every label goes to `labels` and is drawn as HTML (selectable text), shapes are SVG ----
const range = computed(() => L.value.yMax - L.value.yMin || 1);
const toY = (v) => L.value.y + L.value.h - ((v - L.value.yMin) / range.value) * L.value.h;
const shapes = computed(() => {
  const { x, y, w, h, xLabels } = L.value, out = { items: [] }, labels = [];
  const label = (lx, ly, text, o = {}) => labels.push({ x: lx, y: ly, text, size: o.size ?? 7, anchor: o.anchor ?? "middle", fill: o.fill ?? MUTED, bold: o.bold });
  const cartesian = props.variant === "bar" || props.variant === "line" || props.variant === "area";
  if (cartesian) {
    for (const t of L.value.yTicks) {
      const ty = toY(t);
      if (props.showGrid) out.items.push({ t: "line", rank: -1, color: GRID, x1: x, y1: ty, x2: x + w, y2: ty, width: 0.5, dash: "3 3" });
      label(x - 4, ty + 3, fmt(t), { anchor: "end" });
    }
    out.items.push({ t: "line", rank: 1, color: FG, x1: x, y1: y + h, x2: x + w, y2: y + h, width: 1 });
  }
  if (props.variant === "bar") {
    const n = xLabels.length, ns = series.value.length, group = w / n, bw = (group * 0.75) / ns;
    xLabels.forEach((lab, ci) => {
      const left = x + ci * group + group * 0.125;
      series.value.forEach((s, si) => {
        const v = s.data[ci]?.value ?? 0, bh = ((v - L.value.yMin) / range.value) * h, bx = left + si * bw, by = y + h - bh;
        out.items.push({ t: "rect", rank: 0, color: s.data[ci]?.color ? resolve(s.data[ci].color) : s.color ? resolve(s.color) : pal(si), x: bx, y: by, w: bw - 1, h: bh });
        if (props.showValues && bh > 10) label(bx + bw / 2 - 0.5, by - 2, fmt(v), { size: 6, fill: FG });
      });
      label(left + (ns * bw) / 2, y + h + 10, truncate(lab, 10));
    });
  } else if (props.variant === "horizontal-bar") {
    const n = xLabels.length, max = Math.max(...series.value.flatMap((s) => s.data.map((d) => d.value)), 1), row = h / n, bh = row * 0.5, lw = 60;
    xLabels.forEach((lab, ci) => {
      const d = series.value[0]?.data[ci], v = d?.value ?? 0, bw = (v / max) * (w - lw), ry = y + ci * row;
      out.items.push({ t: "rect", rank: 0, color: d?.color ? resolve(d.color) : series.value[0]?.color ? resolve(series.value[0].color) : pal(ci), x: x + lw, y: ry + (row - bh) / 2, w: Math.max(bw, 1), h: bh });
      label(x + lw - 4, ry + row / 2 + 3, truncate(lab, 14), { anchor: "end" });
      if (props.showValues) label(x + lw + bw + 3, ry + row / 2 + 3, fmt(v), { size: 6, anchor: "start", fill: FG });
    });
    out.items.push({ t: "line", rank: 1, color: FG, x1: x + lw, y1: y, x2: x + lw, y2: y + h, width: 1 });
  } else if (props.variant === "line" || props.variant === "area") {
    const n = xLabels.length, xf = (i) => x + (i / Math.max(n - 1, 1)) * w;
    series.value.forEach((s, si) => {
      const c = s.color ? resolve(s.color) : pal(si), pts = s.data.map((d, i) => ({ x: xf(i), y: toY(d.value) }));
      const line = props.smooth ? smooth(pts) : `M ${pts.map((p) => `${p.x} ${p.y}`).join(" L ")}`;
      if (props.variant === "area" && pts.length > 1) out.items.push({ t: "path", rank: 0, color: c, d: `${line} L ${pts.at(-1).x} ${y + h} L ${pts[0].x} ${y + h} Z`, fill: true, opacity: 0.2 });
      out.items.push({ t: "path", rank: 1, color: c, d: line, width: 2 });
      if (props.showDots) pts.forEach((p) => out.items.push({ t: "circle", rank: 2, color: c, cx: p.x, cy: p.y, r: 3 }));
      if (props.showValues) pts.forEach((p, i) => label(p.x, p.y - 5, fmt(s.data[i].value), { size: 6, fill: c }));
    });
    xLabels.forEach((lab, i) => label(xf(i), y + h + 10, truncate(lab, 8)));
  } else {
    const cx = L.value.svgW / 2, cy = L.value.svgH / 2, r = Math.min(L.value.svgW, L.value.svgH) / 2 - 20, inner = props.variant === "donut" ? r * 0.52 : 0;
    const data = series.value[0]?.data ?? [], total = data.reduce((a, d) => a + d.value, 0) || 1;
    let angle = 0;
    data.forEach((d, i) => {
      const sweep = (d.value / total) * 360, mid = angle + sweep / 2;
      const slice = arc(cx, cy, r, angle, angle + sweep, inner);
      out.items.push({ t: "path", rank: 0, color: d.color ? resolve(d.color) : pal(i), d: slice, fill: true }, { t: "path", rank: 1, color: "var(--background)", d: slice, width: 1 });
      if (sweep > 15) { const p = polar(cx, cy, r * 1.18, mid); label(p.x, p.y + 3, truncate(d.label, 10), { anchor: p.x > cx ? "start" : "end" }); }
      angle += sweep;
    });
    if (inner && props.centerLabel) { out.items.push({ t: "circle", rank: 2, color: "var(--background)", cx, cy, r: inner }); label(cx, cy + 4, props.centerLabel, { size: 9, fill: FG, bold: true }); }
  }
  if (!pie.value && props.xLabel) label(x + w / 2, props.height - 2, props.xLabel, { size: 8 });
  if (!pie.value && props.yLabel) label(2, 7, props.yLabel, { size: 7, anchor: "start" });
  return { ...out, labels };
});

// one SVG layer per (rank, color): the color sits on an HTML wrapper as `color`, shapes use currentColor
const layers = computed(() => { const m = new Map(); for (const it of shapes.value.items) { const k = `${it.rank}|${it.color}`; if (!m.has(k)) m.set(k, { rank: it.rank, color: it.color, items: [] }); m.get(k).items.push(it); } return [...m.values()].sort((a, b) => a.rank - b.rank); });

// legend: one entry per series, or per slice for pie/donut; a single unnamed series needs none
const legend = computed(() => {
  if (props.legend === "none") return [];
  if (pie.value) return (series.value[0]?.data ?? []).map((d, i) => ({ name: d.label, color: d.color ? resolve(d.color) : pal(i) }));
  return series.value.length > 1 ? series.value.map((s, i) => ({ name: s.name, color: s.color ? resolve(s.color) : pal(i) })) : [];
});
const LW = 64; // label box width, pt
const labelStyle = (l) => ({ left: `${l.anchor === "middle" ? l.x - LW / 2 : l.anchor === "end" ? l.x - LW : l.x}pt`, top: `${l.y - l.size * 0.85}pt`, width: `${LW}pt`, fontSize: `${l.size}pt`, color: l.fill, textAlign: l.anchor === "middle" ? "center" : l.anchor === "end" ? "right" : "left", fontWeight: l.bold ? 700 : undefined });
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('mb-component flex flex-col', noWrap && 'break-inside-avoid', $attrs.class)">
    <div v-if="title" class="mb-0.5 text-base font-semibold leading-heading text-foreground">{{ title }}</div>
    <div v-if="subtitle" class="mb-1.5 text-xs text-muted-foreground">{{ subtitle }}</div>
    <div :class="legend.length && props.legend === 'right' ? 'flex flex-row items-start' : 'flex flex-col'">
      <div class="relative" :style="{ width: `${W}pt`, height: `${height}pt` }">
        <!-- Takumi renders var() in SVG fill/stroke (attributes, style, even `color` on an SVG child) as black, but resolves it as `color` on an HTML wrapper -->
        <div v-for="(layer, li) in layers" :key="li" class="absolute left-0 top-0" :style="{ color: layer.color, width: `${W}pt`, height: `${height}pt` }">
          <svg :width="+(W * 4 / 3).toFixed(2)" :height="+(height * 4 / 3).toFixed(2)" :viewBox="`0 0 ${W} ${height}`">
            <template v-for="(it, i) in layer.items" :key="i">
              <line v-if="it.t === 'line'" :x1="it.x1" :y1="it.y1" :x2="it.x2" :y2="it.y2" stroke="currentColor" :stroke-width="it.width" :stroke-dasharray="it.dash" />
              <rect v-else-if="it.t === 'rect'" :x="it.x" :y="it.y" :width="it.w" :height="it.h" fill="currentColor" />
              <path v-else-if="it.t === 'path'" :d="it.d" :fill="it.fill ? 'currentColor' : 'none'" :fill-opacity="it.opacity" :stroke="it.fill ? 'none' : 'currentColor'" :stroke-width="it.width" />
              <circle v-else :cx="it.cx" :cy="it.cy" :r="it.r" fill="currentColor" />
            </template>
          </svg>
        </div>
        <div v-for="(l, i) in shapes.labels" :key="`t${i}`" class="absolute leading-none" :style="labelStyle(l)">{{ l.text }}</div>
      </div>
      <div v-if="legend.length" :class="props.legend === 'right' ? 'ml-3 mt-[18pt] flex min-w-[120pt] flex-col gap-2' : 'mt-1.5 flex flex-row flex-wrap gap-3'">
        <div v-for="e in legend" :key="e.name" class="flex flex-row items-center gap-1">
          <div class="size-2" :style="{ backgroundColor: e.color }" />
          <span class="text-xs text-muted-foreground">{{ e.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
