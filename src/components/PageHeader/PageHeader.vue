<script setup>
import { computed } from "vue";
import { cn, rest, color } from "../../lib/ui.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  title: { type: String, required: true },
  subtitle: String,
  rightText: String,
  rightSubText: String,
  variant: { type: String, default: "simple" }, // simple | centered | minimal | branded | logo-left | logo-right | two-column
  background: String, // theme token or any CSS color
  titleColor: String,
  marginBottom: Number, // pt; default is the section gap (36pt)
  address: String,
  phone: String,
  email: String,
  fixed: Boolean, // repeat at the top of every page
  noWrap: { type: Boolean, default: true },
});

const rule = "border-b-[2pt] border-border pb-4";
const containers = {
  simple: `flex flex-row items-start justify-between ${rule}`,
  centered: `flex flex-col items-center ${rule}`,
  minimal: "flex flex-row items-center justify-between border-b-[4pt] border-primary pb-3",
  branded: "flex flex-col items-center bg-primary rounded-sm p-6",
  "logo-left": `flex flex-row items-center ${rule}`,
  "logo-right": `flex flex-row items-center justify-between ${rule}`,
  "two-column": `flex flex-row items-start justify-between ${rule}`,
};
const branded = computed(() => props.variant === "branded");
const centered = computed(() => props.variant === "centered" || branded.value);
const hasRight = computed(() => props.rightText || props.rightSubText);
const hasContact = computed(() => props.address || props.phone || props.email);
</script>

<template>
  <header
    v-bind="rest($attrs)"
    :class="cn(containers[variant], !noWrap || 'break-inside-avoid', fixed && 'fixed inset-x-0 top-0', $attrs.class)"
    :style="[$attrs.style, { marginBottom: `${marginBottom ?? 36}pt` }, background && { backgroundColor: color(background) }]"
  >
    <div v-if="variant === 'logo-left' && $slots.logo" class="mr-4 size-12"><slot name="logo" /></div>
    <div :class="cn('flex flex-col', !centered && 'flex-1')">
      <div :class="cn('text-h3 font-bold leading-heading text-foreground', centered && 'text-center', branded && 'text-primary-foreground', variant === 'minimal' && 'text-h3')" :style="titleColor && { color: color(titleColor) }">{{ title }}</div>
      <div v-if="subtitle" :class="cn('mt-1 leading-body text-muted-foreground', centered && 'text-center', branded && 'text-primary-foreground')">{{ subtitle }}</div>
    </div>
    <div v-if="variant === 'logo-right' && $slots.logo" class="ml-4 size-12"><slot name="logo" /></div>
    <div v-if="['simple', 'minimal', 'logo-left'].includes(variant) && hasRight" class="flex flex-col items-end">
      <div v-if="rightText" class="text-right font-medium text-foreground">{{ rightText }}</div>
      <div v-if="rightSubText" class="mt-1 text-right text-xs text-muted-foreground">{{ rightSubText }}</div>
    </div>
    <div v-if="variant === 'two-column' && hasContact" class="flex flex-col items-end">
      <div v-for="line in [address, phone, email].filter(Boolean)" :key="line" class="mt-0.5 text-right text-xs text-muted-foreground">{{ line }}</div>
    </div>
  </header>
</template>
