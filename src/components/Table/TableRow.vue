<script setup>
import { inject, provide, computed } from "vue";
import { cn, rest } from "../../lib/ui.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  header: Boolean, // normally implied by <TableHeader>
  footer: Boolean,
  stripe: Boolean, // force a stripe on this row
});

const { variant, zebra } = inject("table", { variant: computed(() => "line"), zebra: computed(() => false) });
const section = inject("section", "body");
const kind = computed(() => (props.header || section === "header" ? "header" : props.footer || section === "footer" ? "footer" : "body"));
provide("row", kind);

const headers = {
  bordered: "bg-muted", compact: "bg-muted", grid: "bg-muted", striped: "bg-muted", "primary-header": "bg-primary", line: "", minimal: "",
};
</script>

<template>
  <tr v-bind="rest($attrs)" :class="cn('break-inside-avoid', kind === 'header' && headers[variant], kind === 'footer' && variant === 'striped' && 'bg-muted', kind === 'body' && (stripe || zebra) && 'even:bg-muted', $attrs.class)"><slot /></tr>
</template>
