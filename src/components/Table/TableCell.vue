<script setup>
import { inject, computed } from "vue";
import { cn, rest } from "../../lib/ui.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  align: String, // left | center | right
  width: [String, Number], // css width; a number is pt
});

const variant = inject("table", { variant: computed(() => "line") }).variant;
const kind = inject("row", computed(() => "body"));
const v = computed(() => variant.value);

const pad = { compact: "px-2 py-0.5", minimal: "px-1.5 py-1.25" };
const sides = { grid: "border-r-[0.5pt] border-border last:border-r-0", bordered: "border-r-[0.5pt] border-border last:border-r-0" };
// every row except a striped table's gets a divider; header rows a stronger one
const dividers = { bordered: "0.5pt", compact: "1pt", grid: "1pt", line: "1pt", minimal: "1pt", striped: "1pt", "primary-header": "" };
const bodyRule = new Set(["bordered", "compact", "grid", "line", "minimal", "primary-header"]);
const rule = computed(() => (kind.value === "header" ? `border-b-[${dividers[v.value] || "0pt"}]` : kind.value === "footer" ? "border-t-[1pt]" : bodyRule.has(v.value) ? "border-b-[0.5pt]" : ""));
const text = computed(() => {
  const compact = v.value === "compact", pri = v.value === "primary-header";
  if (kind.value === "header") {
    if (compact || pri) return cn("text-xs font-semibold uppercase tracking-[0.6pt]", pri ? "text-primary-foreground" : "text-foreground");
    if (v.value === "minimal") return "font-medium text-muted-foreground";
    return v.value === "bordered" ? "font-bold" : "font-semibold";
  }
  if (kind.value === "footer") return "font-semibold";
  return compact ? "text-xs" : "";
});
const aligns = { left: "text-left", center: "text-center", right: "text-right" };
const w = computed(() => (props.width === undefined ? undefined : typeof props.width === "number" ? `${props.width}pt` : props.width));
</script>

<!-- break-inside-avoid on the cells as well as the row: without it Takumi paints the top few pt of the next row (borders, stripe) at the bottom of the page before the row moves on -->
<template>
  <component :is="kind === 'header' ? 'th' : 'td'" v-bind="rest($attrs)" :class="cn('break-inside-avoid px-2.5 py-[5.5pt] align-middle leading-[1.2] text-foreground', pad[v], sides[v], rule, rule && 'border-border', text, aligns[align] ?? (kind === 'header' ? 'text-left' : ''), $attrs.class)" :style="[$attrs.style, w && { width: w }]"><slot /></component>
</template>
