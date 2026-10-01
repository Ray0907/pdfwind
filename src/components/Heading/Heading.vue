<script setup>
import { computed } from "vue";
import { cn, rest, color } from "../../lib/ui.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  level: { type: Number, default: 1 }, // 1-6
  align: String, // left | center | right
  color: String, // theme token or any CSS color
  transform: String, // uppercase | lowercase | capitalize
  weight: { type: String, default: "bold" }, // normal | medium | semibold | bold
  tracking: { type: String, default: "normal" }, // tighter | tight | normal | wide | wider
  noMargin: Boolean,
});

const level = computed(() => Math.min(Math.max(Math.round(props.level), 1), 6));
// [size, margin top, margin bottom]
const levels = [
  null,
  "text-h1 mt-0 mb-paragraph",
  "text-h2 mt-section mb-paragraph",
  "text-h3 mt-component mb-paragraph",
  "text-h4 mt-paragraph mb-paragraph",
  "text-h5 mt-paragraph mb-1",
  "text-h6 mt-paragraph mb-1",
];
const weights = { normal: "font-normal", medium: "font-medium", semibold: "font-semibold", bold: "font-bold" };
const trackings = { tighter: "tracking-tighter", tight: "tracking-tight", normal: "tracking-normal", wide: "tracking-wide", wider: "tracking-wider" };
const transforms = { uppercase: "uppercase tracking-wider", lowercase: "lowercase", capitalize: "capitalize" };
const aligns = { left: "text-left", center: "text-center", right: "text-right" };
</script>

<template>
  <component :is="`h${level}`" v-bind="rest($attrs)" :class="cn('leading-heading text-foreground', levels[level], weights[weight], trackings[tracking], transforms[transform], aligns[align], noMargin && 'my-0', $attrs.class)" :style="[$attrs.style, props.color && { color: color(props.color) }]">
    <slot />
  </component>
</template>
