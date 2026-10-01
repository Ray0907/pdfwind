<script setup>
import { computed } from "vue";
import { cn, rest, color } from "../../lib/ui.js";
import DividerLine from "./DividerLine.vue";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  spacing: { type: String, default: "md" }, // none | sm | md | lg
  variant: { type: String, default: "solid" }, // solid | dashed | dotted
  color: String, // theme token or any CSS color
  thickness: { type: String, default: "thin" }, // thin | medium | thick
  label: String,
  width: [String, Number], // css width; a number is px
});

const spacings = { none: "my-0", sm: "my-paragraph", md: "my-component", lg: "my-section" };
const pt = { thin: 1, medium: 2, thick: 4 };
const w = computed(() => (props.width === undefined ? undefined : typeof props.width === "number" ? `${props.width}px` : props.width));
</script>

<template>
  <div v-if="label" v-bind="rest($attrs)" :class="cn('flex flex-row items-center', spacings[spacing], $attrs.class)" :style="[$attrs.style, { width: w }]">
    <DividerLine class="flex-1" :variant="variant" :thickness="pt[thickness]" :color="color(props.color ?? 'border')" />
    <span class="px-3 text-xs font-medium uppercase tracking-wider" :style="{ color: color(props.color ?? 'muted-foreground') }">{{ label }}</span>
    <DividerLine class="flex-1" :variant="variant" :thickness="pt[thickness]" :color="color(props.color ?? 'border')" />
  </div>
  <div v-else v-bind="rest($attrs)" :class="cn('flex', spacings[spacing], $attrs.class)" :style="[$attrs.style, { width: w }]">
    <DividerLine :variant="variant" :thickness="pt[thickness]" :color="color(props.color ?? 'border')" />
  </div>
</template>
