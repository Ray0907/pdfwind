<script setup>
// Internal: one rule. solid = border; dashed/dotted = a long SVG stroke clipped to the width
// (Takumi draws dashed/dotted borders only on all four sides, and mis-renders `transparent` gradient stops).
const props = defineProps({ variant: String, thickness: Number, color: String }); // thickness in pt, color a css color
const px = props.thickness * 4 / 3;
</script>

<template>
  <div v-if="variant === 'solid'" class="w-full" :style="{ borderBottom: `${thickness}pt solid ${color}` }" />
  <div v-else class="w-full overflow-hidden" :style="{ height: `${thickness}pt`, color }">
    <svg width="1600" :height="px"><line x1="0" :y1="px / 2" x2="1600" :y2="px / 2" stroke="currentColor" :stroke-width="px"
      :stroke-linecap="variant === 'dotted' ? 'round' : 'butt'" :stroke-dasharray="variant === 'dotted' ? `0.01 ${px * 2.2}` : `${px * 6} ${px * 4}`" /></svg>
  </div>
</template>
