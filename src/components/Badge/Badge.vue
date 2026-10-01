<script setup>
import { cn, rest, color as resolve } from "../../lib/ui.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  label: String, // takes precedence over the default slot
  variant: { type: String, default: "default" }, // default | primary | success | warning | destructive | info | outline
  size: { type: String, default: "md" }, // sm | md | lg
  background: String, // theme token or any CSS color
  color: String,
});

const variants = {
  default: "border-border bg-muted text-muted-foreground",
  primary: "border-primary bg-primary text-primary-foreground",
  success: "border-success bg-muted text-success",
  warning: "border-warning bg-muted text-warning",
  destructive: "border-destructive bg-muted text-destructive",
  info: "border-info bg-muted text-info",
  outline: "border-border bg-background text-foreground",
};
const sizes = { sm: "px-2 py-0.5 text-[9pt]", md: "px-3 py-1 text-xs", lg: "px-4 py-2 text-sm" };
</script>

<template>
  <span v-bind="rest($attrs)" :class="cn('inline-flex flex-row items-center self-start rounded-full border-[2pt] font-semibold tracking-[0.3pt]', variants[variant], sizes[size], $attrs.class)" :style="[$attrs.style, background && { backgroundColor: resolve(background) }, props.color && { color: resolve(props.color) }]"><template v-if="label">{{ label }}</template><slot v-else /></span>
</template>
