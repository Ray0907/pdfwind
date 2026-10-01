<script setup>
import { cn, rest, color } from "../../lib/ui.js";

defineOptions({ inheritAttrs: false });
defineProps({
  items: { type: Array, required: true }, // [{ key, value, valueColor?, valueStyle?, keyStyle? }]  (styles are plain CSS objects)
  direction: { type: String, default: "horizontal" }, // horizontal | vertical
  divided: Boolean,
  size: { type: String, default: "md" }, // sm | md | lg
  labelFlex: { type: Number, default: 1 },
  labelColor: String, // theme token or any CSS color
  valueColor: String,
  boldValue: Boolean,
  noWrap: Boolean,
  dividerColor: String,
  dividerThickness: Number, // pt
  dividerMargin: Number, // pt
});

const sizes = { sm: "text-xs", md: "text-body", lg: "text-base" };
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('flex flex-col', noWrap && 'break-inside-avoid', $attrs.class)">
    <div
      v-for="(item, i) in items" :key="item.key"
      :class="direction === 'horizontal' ? 'flex flex-row items-start py-1' : 'mb-paragraph flex flex-col'"
      :style="[divided && i < items.length - 1 && { borderBottom: `${dividerThickness ?? 2}pt solid ${color(dividerColor ?? 'border')}`, marginBottom: dividerMargin !== undefined ? `${dividerMargin}pt` : undefined }]"
    >
      <div :class="cn('font-medium leading-[1.35] text-muted-foreground', sizes[size])" :style="[labelColor && { color: color(labelColor) }, direction === 'horizontal' && { flex: labelFlex }, item.keyStyle]">{{ item.key }}</div>
      <div :class="cn('leading-[1.35] text-foreground', sizes[size], boldValue && 'font-bold', direction === 'horizontal' && 'flex-1 text-right')" :style="[(item.valueColor ?? valueColor) && { color: color(item.valueColor ?? valueColor) }, item.valueStyle]">{{ item.value }}</div>
    </div>
  </div>
</template>
