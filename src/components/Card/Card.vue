<script setup>
import { cn, rest } from "../../lib/ui.js";

defineOptions({ inheritAttrs: false });
defineProps({
  title: String,
  variant: { type: String, default: "default" }, // default | bordered | muted
  padding: { type: String, default: "md" }, // sm | md | lg
  wrap: Boolean, // false keeps the card on one page
});

const variants = { default: "border-[1pt]", bordered: "border-[2pt]", muted: "border-[1pt] bg-muted" };
const paddings = { sm: "p-2", md: "p-3", lg: "p-4" };
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('flex flex-col mb-component rounded-sm border-border bg-background', variants[variant], paddings[padding], !wrap && 'break-inside-avoid', $attrs.class)">
    <div v-if="title || $slots.title" class="mb-2 border-b-[1pt] border-border pb-1.5 text-base font-semibold leading-heading text-foreground"><slot name="title">{{ title }}</slot></div>
    <slot />
  </div>
</template>
