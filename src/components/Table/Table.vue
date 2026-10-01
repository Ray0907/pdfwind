<script setup>
import { provide, computed } from "vue";
import { cn, rest } from "../../lib/ui.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  variant: { type: String, default: "line" }, // line | grid | minimal | striped | compact | bordered | primary-header
  zebraStripe: Boolean, // striped always zebra-stripes
  noWrap: Boolean, // keep the whole table on one page
});

provide("table", { variant: computed(() => props.variant), zebra: computed(() => props.zebraStripe || props.variant === "striped") });

// Takumi lays out a real <table>: <thead> repeats on every page and rows are never split (break-inside-avoid on <tr>).
// Rounded variants need a wrapper: the table itself cannot clip its corners.
const frames = {
  bordered: "border-[1pt] border-border rounded-sm overflow-hidden",
  grid: "border-[1.5pt] border-border rounded-md overflow-hidden",
  compact: "border-b-[0.5pt] border-border",
  line: "border-b-[0.5pt] border-border",
  "primary-header": "border-b-[0.5pt] border-border",
  striped: "border-y-[0.5pt] border-border",
  minimal: "py-2",
};
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('mb-component w-full', frames[variant], noWrap && 'break-inside-avoid', $attrs.class)">
    <table class="w-full"><slot /></table>
  </div>
</template>
