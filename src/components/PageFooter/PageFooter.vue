<script setup>
import { computed } from "vue";
import { cn, rest, color } from "../../lib/ui.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  leftText: String, // each text can also be given as a slot: #left, #center, #right (e.g. a <PageNumber>)
  centerText: String,
  rightText: String,
  variant: { type: String, default: "simple" }, // simple | centered | branded | minimal | three-column | detailed
  background: String,
  textColor: String,
  marginTop: Number, // pt; default is the section gap (36pt), 0 when sticky
  address: String,
  phone: String,
  email: String,
  website: String,
  fixed: Boolean, // repeat at the bottom of every page
  sticky: Boolean, // pin to the bottom of the nearest positioned parent
  pagePadding: { type: Number, default: 0 }, // pt, horizontal inset
  noWrap: { type: Boolean, default: true },
});

const rule = "border-t-[2pt] border-border pt-3";
const containers = {
  simple: `flex flex-row items-center justify-between ${rule}`,
  centered: `flex flex-col items-center ${rule}`,
  branded: "flex flex-row items-center justify-between bg-primary px-4 py-3",
  minimal: "flex flex-row items-center justify-between py-1",
  "three-column": `flex flex-row items-start justify-between ${rule}`,
  detailed: "flex flex-col border-t-[4pt] border-border pt-3",
};
const branded = computed(() => props.variant === "branded");
const text = computed(() => cn("text-xs leading-body", branded.value ? "text-primary-foreground" : "text-muted-foreground"));
const style = computed(() => props.textColor && { color: color(props.textColor) });
const contacts = computed(() => [["Phone", props.phone], ["Email", props.email], ["Web", props.website]].filter(([, v]) => v));
</script>

<template>
  <footer
    v-bind="rest($attrs)"
    :class="cn(containers[variant], !noWrap || 'break-inside-avoid', fixed && 'fixed inset-x-0 bottom-0', sticky && 'absolute inset-x-0 bottom-0', $attrs.class)"
    :style="[$attrs.style, { marginTop: `${sticky ? 0 : (marginTop ?? 36)}pt`, paddingLeft: pagePadding && `${pagePadding}pt`, paddingRight: pagePadding && `${pagePadding}pt` }, background && { backgroundColor: color(background) }]"
  >
    <!-- simple / minimal / branded: left, (center), right -->
    <template v-if="['simple', 'minimal', 'branded'].includes(variant)">
      <div v-if="leftText || $slots.left" :class="cn(text, 'flex-1', branded && 'font-medium')" :style="style"><slot name="left">{{ leftText }}</slot></div>
      <div v-if="variant === 'simple' && (centerText || $slots.center)" :class="cn(text, 'flex-1 text-center')" :style="style"><slot name="center">{{ centerText }}</slot></div>
      <div v-if="rightText || $slots.right" :class="cn(text, 'text-right')" :style="style"><slot name="right">{{ rightText }}</slot></div>
    </template>
    <template v-else-if="variant === 'centered'">
      <div v-if="leftText || $slots.left" :class="cn(text, 'mb-1 text-center')" :style="style"><slot name="left">{{ leftText }}</slot></div>
      <div v-if="rightText || $slots.right" :class="cn(text, 'text-center')" :style="style"><slot name="right">{{ rightText }}</slot></div>
    </template>
    <template v-else-if="variant === 'three-column'">
      <div class="flex flex-1 flex-col">
        <div v-if="leftText || $slots.left" :class="cn(text, 'font-medium text-foreground')" :style="style"><slot name="left">{{ leftText }}</slot></div>
        <div v-if="address" :class="cn(text, 'flex-1')" :style="style">{{ address }}</div>
      </div>
      <div class="flex flex-1 flex-col items-center">
        <div v-for="[k, v] in contacts" :key="k" :class="cn(text, 'mt-0.5 text-center text-[9pt]')" :style="style">{{ v }}</div>
      </div>
      <div class="flex flex-1 flex-col items-end">
        <div v-if="rightText || $slots.right" :class="cn(text, 'text-right')" :style="style"><slot name="right">{{ rightText }}</slot></div>
      </div>
    </template>
    <template v-else>
      <!-- detailed -->
      <div class="mb-2 flex flex-row items-start justify-between">
        <div class="flex flex-1 flex-col">
          <div v-if="leftText || $slots.left" :class="cn(text, 'font-bold text-foreground')" :style="style"><slot name="left">{{ leftText }}</slot></div>
          <div v-if="address" :class="cn(text, 'flex-1')" :style="style">{{ address }}</div>
        </div>
        <div class="flex flex-col items-end">
          <div v-for="[k, v] in contacts" :key="k" :class="cn(text, 'text-right')" :style="style">{{ k }}: {{ v }}</div>
        </div>
      </div>
      <div v-if="rightText || $slots.right" :class="cn(text, 'border-t-[2pt] border-border pt-2 text-center')" :style="style"><slot name="right">{{ rightText }}</slot></div>
    </template>
  </footer>
</template>
