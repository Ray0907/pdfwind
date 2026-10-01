<script setup>
import { computed } from "vue";
import { cn, rest } from "../../lib/ui.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  title: String,
  subtitle: String,
  groups: { type: Array, required: true }, // [{ title?, layout?: single | two-column | three-column, fields: [{ label, hint?, height?: pt, width? }] }]
  variant: { type: String, default: "underline" }, // underline | box | outlined | ghost
  labelPosition: { type: String, default: "above" }, // above | left
  noWrap: Boolean,
});

// the blank area of a field, per variant
const areas = {
  underline: "border-b-[1pt] border-border",
  box: "border-[0.75pt] border-border rounded-sm",
  outlined: "border-[0.75pt] border-foreground rounded-md",
  ghost: "bg-muted rounded-sm",
};
const padded = computed(() => props.variant !== "underline");
const cols = { single: 1, "two-column": 2, "three-column": 3 };
// fields are split into `cols` columns, filled column by column (like pdfcn)
const columnsOf = (g) => {
  const n = cols[g.layout ?? "single"], size = Math.ceil(g.fields.length / n), out = [];
  for (let i = 0; i < n; i++) out.push(g.fields.slice(i * size, (i + 1) * size));
  return out;
};
const css = (v) => (typeof v === "number" ? `${v}pt` : v);
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('mb-component w-full', noWrap && 'break-inside-avoid', $attrs.class)">
    <div v-if="title" class="mb-1 text-xl font-bold leading-heading text-foreground">{{ title }}</div>
    <div v-if="subtitle" class="mb-3 text-sm leading-body text-muted-foreground">{{ subtitle }}</div>
    <div v-if="title || subtitle" class="mb-4 border-b-[1pt] border-border" />
    <div v-for="(g, gi) in groups" :key="gi" class="mb-5">
      <div v-if="g.title" class="mb-3 text-xs font-semibold uppercase leading-[1.2] tracking-[0.8pt] text-muted-foreground">{{ g.title }}</div>
      <div class="flex flex-row gap-4">
        <div v-for="(col, ci) in columnsOf(g)" :key="ci" class="flex flex-1 flex-col">
          <div v-for="(f, fi) in col" :key="fi" :class="cn('mb-3 w-full', labelPosition === 'left' && 'flex flex-row items-end gap-2')" :style="f.width !== undefined && { width: css(f.width) }">
            <div :class="labelPosition === 'left' ? cn('w-[80pt] font-medium leading-body text-muted-foreground', padded && 'pb-1') : 'mb-1 text-xs font-medium uppercase leading-[1.2] tracking-[0.5pt] text-muted-foreground'">{{ f.label }}</div>
            <div :class="cn(areas[variant], labelPosition === 'left' ? 'flex-1' : 'w-full')" :style="{ minHeight: `${f.height ?? 18}pt` }">
              <!-- hint = placeholder: muted-foreground at 65% (legible in print, still lighter than the label); color alpha, not `opacity`, which clips text in Takumi -->
              <div v-if="f.hint" :class="cn('text-xs', padded ? 'px-2 py-1' : 'py-0.5')" style="color: color-mix(in srgb, var(--muted-foreground) 65%, transparent)">{{ f.hint }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
