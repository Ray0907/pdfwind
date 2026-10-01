<script setup>
import { cn, rest } from "../../lib/ui.js";

defineOptions({ inheritAttrs: false });
defineProps({
  variant: { type: String, default: "info" }, // info | success | warning | error
  title: String,
  showIcon: { type: Boolean, default: true },
  showBorder: { type: Boolean, default: true },
});

const colors = { info: "text-info border-info", success: "text-success border-success", warning: "text-warning border-warning", error: "text-destructive border-destructive" };
</script>

<template>
  <div v-if="title || $slots.default" v-bind="rest($attrs)" :class="cn('mb-component flex flex-row break-inside-avoid rounded-md bg-muted p-3', showBorder && 'border-l-[4pt]', colors[variant], $attrs.class)">
    <!-- icon strokes use currentColor = the variant color; the text below resets to the normal text colors -->
    <div v-if="showIcon" class="mr-2.5 flex w-5 flex-row justify-center pt-0.5">
      <svg width="21.33" height="21.33" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <template v-if="variant === 'error'"><circle cx="8" cy="8" r="7" /><line x1="5.5" y1="5.5" x2="10.5" y2="10.5" /><line x1="10.5" y1="5.5" x2="5.5" y2="10.5" /></template>
        <template v-else-if="variant === 'success'"><circle cx="8" cy="8" r="7" /><path d="M5 8 L7 10 L11 6" /></template>
        <template v-else-if="variant === 'warning'"><path d="M8 1.5 L15 14.5 L1 14.5 Z" /><line x1="8" y1="6" x2="8" y2="10" /><circle cx="8" cy="12.5" r="0.75" fill="currentColor" stroke="none" /></template>
        <template v-else><circle cx="8" cy="8" r="7" /><circle cx="8" cy="4.5" r="1" fill="currentColor" stroke="none" /><line x1="8" y1="7" x2="8" y2="11.5" /></template>
      </svg>
    </div>
    <div class="flex flex-1 flex-col">
      <div v-if="title" class="mb-1 text-sm font-semibold leading-heading text-foreground">{{ title }}</div>
      <div class="text-sm leading-body text-muted-foreground"><slot /></div>
    </div>
  </div>
</template>
