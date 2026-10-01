<script setup>
import { cn, rest, color } from "../../lib/ui.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  variant: String, // xs | sm | base | lg | xl | 2xl | 3xl ; unset = 11pt body
  align: String, // left | center | right | justify
  color: String, // theme token or any CSS color
  weight: String, // normal | medium | semibold | bold
  italic: Boolean,
  decoration: String, // underline | line-through | none
  transform: String, // uppercase | lowercase | capitalize
  noMargin: Boolean,
});

const variants = { xs: "text-xs", sm: "text-sm", base: "text-base", lg: "text-lg", xl: "text-xl", "2xl": "text-2xl", "3xl": "text-3xl" };
const weights = { normal: "font-normal", medium: "font-medium", semibold: "font-semibold", bold: "font-bold" };
const decorations = { underline: "underline", "line-through": "line-through", none: "no-underline" };
const transforms = { uppercase: "uppercase tracking-wider", lowercase: "lowercase", capitalize: "capitalize" };
const aligns = { left: "text-left", center: "text-center", right: "text-right", justify: "text-justify" };
</script>

<template>
  <p v-bind="rest($attrs)" :class="cn('text-body leading-body text-foreground mt-0 mb-paragraph', variants[variant], weights[weight], italic && 'italic', decorations[decoration], transforms[transform], aligns[align], noMargin && 'mb-0', $attrs.class)" :style="[$attrs.style, props.color && { color: color(props.color) }]">
    <slot />
  </p>
</template>
