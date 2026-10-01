<script setup>
import { computed } from "vue";
import KeyValue from "../../components/KeyValue/KeyValue.vue";
import { money, totalsOf, taxLabel } from "../invoice.js";

// Subtotal / tax / grand total, rule-separated. Math comes from the line items (or an explicit data.summary).
const props = defineProps({
  data: { type: Object, required: true },
  items: Array, // defaults to data.items / data.services
  totalLabel: { type: String, default: "Total" },
  currency: { type: String, default: "USD" },
  locale: { type: String, default: "en-US" },
  totalColor: String, // token or CSS color for the grand total
  size: { type: String, default: "sm" },
  big: { type: Array, default: () => ["12pt", "12pt"] }, // [label size, value size] of the grand total
});
const items = computed(() => {
  const t = totalsOf(props.data, props.items), f = (n) => money(n, props), strong = (s, color) => ({ fontSize: s, fontWeight: 700, ...(color && { color }) });
  return [{ key: "Subtotal", value: f(t.subtotal) }, { key: taxLabel(props.data), value: f(t.tax) }, { key: props.totalLabel, value: f(t.total), keyStyle: strong(props.big[0]), valueStyle: strong(props.big[1], props.totalColor ? `var(--${props.totalColor})` : undefined) }];
});
</script>

<template>
  <KeyValue :items="items" :size="size" divided :divider-thickness="1" />
</template>
