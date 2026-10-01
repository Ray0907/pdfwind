<script setup>
import { cn, rest } from "../../lib/ui.js";

defineOptions({ inheritAttrs: false });
defineProps({
  gap: { type: String, default: "md" }, // none | sm | md | lg | xl
  direction: { type: String, default: "vertical" }, // vertical | horizontal
  align: String, // start | center | end | stretch
  justify: String, // start | center | end | between | around
  wrap: Boolean,
});

const gaps = { none: "gap-0", sm: "gap-2", md: "gap-4", lg: "gap-6", xl: "gap-8" };
const aligns = { start: "items-start", center: "items-center", end: "items-end", stretch: "items-stretch" };
const justifies = { start: "justify-start", center: "justify-center", end: "justify-end", between: "justify-between", around: "justify-around" };
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('flex', direction === 'horizontal' ? 'flex-row' : 'flex-col', gaps[gap], aligns[align], justifies[justify], wrap && 'flex-wrap', $attrs.class)">
    <slot />
  </div>
</template>
