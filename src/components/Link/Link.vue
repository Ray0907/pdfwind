<script setup>
import { cn, rest, color } from "../../lib/ui.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  href: { type: String, required: true },
  align: String, // left | center | right
  color: String, // theme token or any CSS color
  variant: { type: String, default: "default" }, // default | muted | primary
  underline: { type: String, default: "always" }, // always | none
});

const variants = {
  default: "text-accent font-medium",
  muted: "text-muted-foreground font-normal",
  primary: "text-primary font-semibold",
};
const aligns = { left: "text-left", center: "text-center", right: "text-right" };
</script>

<template>
  <a :href="href" v-bind="rest($attrs)" :class="cn('text-body leading-body mb-paragraph', variants[variant], underline === 'none' ? 'no-underline' : 'underline', aligns[align], $attrs.class)" :style="[$attrs.style, props.color && { color: color(props.color) }]">
    <slot />
  </a>
</template>
