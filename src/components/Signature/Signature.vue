<script setup>
import { cn, rest } from "../../lib/ui.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  variant: { type: String, default: "single" }, // single | double | inline
  label: { type: String, default: "Signature" },
  name: String,
  title: String,
  date: String,
  signers: Array, // double: [{ label?, name?, title?, date? }, { ... }]
});

const signers = () => props.signers ?? [{ label: "Authorized by" }, { label: "Approved by" }];
const single = () => [{ label: props.label, name: props.name, title: props.title, date: props.date }];
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('mb-component mt-section break-inside-avoid', $attrs.class)">
    <div v-if="variant === 'inline'" class="flex flex-row flex-wrap items-center gap-3">
      <span class="text-sm text-muted-foreground">{{ label }}:</span>
      <div class="h-5 min-w-[120pt] border-b-[1pt] border-foreground px-2" />
      <span v-if="name" class="text-body text-foreground">{{ name }}</span>
    </div>
    <div v-else :class="variant === 'double' ? 'flex flex-row justify-between gap-8' : ''">
      <div v-for="(s, i) in variant === 'double' ? signers() : single()" :key="i" class="flex min-w-[140pt] flex-1 flex-col">
        <div v-if="s.label" class="mb-1 text-sm text-muted-foreground">{{ s.label }}</div>
        <div class="mb-1 min-h-6 border-b-[1pt] border-foreground" />
        <div v-if="s.name" class="text-body font-semibold text-foreground">{{ s.name }}</div>
        <div v-if="s.title" class="text-sm text-muted-foreground">{{ s.title }}</div>
        <div v-if="s.date" class="mt-px text-xs text-muted-foreground">{{ s.date }}</div>
      </div>
    </div>
  </div>
</template>
