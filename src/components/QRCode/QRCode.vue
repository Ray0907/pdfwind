<script setup>
import { computed } from "vue";
import QRCode from "qrcode";
import { cn, rest, color as resolve } from "../../lib/ui.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  value: { type: String, required: true },
  size: { type: Number, default: 100 }, // pt
  color: { type: String, default: "#000000" }, // theme token or any CSS color
  backgroundColor: { type: String, default: "#ffffff" }, // "transparent" for none
  errorLevel: { type: String, default: "M" }, // L | M | Q | H
  margin: { type: Number, default: 2 }, // quiet zone, in modules
  caption: String,
});

// `qrcode` (same library pdfcn uses) does the encoding; we only draw its module matrix.
// One <path> with a run per row of dark modules: far fewer nodes than a <rect> per module, and no anti-aliasing seams.
const geometry = computed(() => {
  const { size: n, data } = QRCode.create(props.value, { errorCorrectionLevel: props.errorLevel }).modules;
  const total = n + props.margin * 2, unit = props.size / total;
  const f = (v) => +v.toFixed(3);
  let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (!data[y * n + x]) continue;
    let run = 1; while (x + run < n && data[y * n + x + run]) run++;
    d += `M${f((x + props.margin) * unit)} ${f((y + props.margin) * unit)}h${f(run * unit)}v${f(unit)}h${f(-run * unit)}z`;
    x += run;
  }
  return d;
});
const px = computed(() => +(props.size * 4 / 3).toFixed(2));
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('flex flex-col items-center', $attrs.class)">
    <!-- colors sit on an HTML wrapper (background-color / color): Takumi resolves var() there but renders it black inside SVG fill -->
    <div :style="{ width: `${size}pt`, height: `${size}pt`, color: resolve(color), backgroundColor: backgroundColor === 'transparent' ? undefined : resolve(backgroundColor) }">
      <svg :width="px" :height="px" :viewBox="`0 0 ${size} ${size}`"><path :d="geometry" fill="currentColor" /></svg>
    </div>
    <div v-if="caption" class="mt-1 text-center text-xs text-muted-foreground">{{ caption }}</div>
  </div>
</template>
