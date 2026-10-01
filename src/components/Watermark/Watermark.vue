<script setup>
import { cn, rest, color as resolve } from "../../lib/ui.js";

defineOptions({ inheritAttrs: false });
defineProps({
  text: { type: String, required: true },
  opacity: { type: Number, default: 0.15 },
  fontSize: { type: Number, default: 60 }, // pt
  color: { type: String, default: "muted-foreground" }, // theme token or any CSS color
  angle: { type: Number, default: -45 },
  position: { type: String, default: "center" }, // center | top-left | top-right | bottom-left | bottom-right
});

const positions = {
  center: "items-center justify-center",
  "top-left": "items-start justify-start pt-18 pl-14",
  "top-right": "items-start justify-end pt-18 pr-14",
  "bottom-left": "items-end justify-start pb-18 pl-14",
  "bottom-right": "items-end justify-end pb-18 pr-14",
};
</script>

<template>
  <!-- position: fixed repeats on every page; -z-10 keeps it behind the content.
       Opacity is applied as color alpha: Takumi clips `opacity` text to its measured box, cutting wide bold/letter-spaced glyphs. -->
  <div v-bind="rest($attrs)" :class="cn('fixed inset-0 -z-10 flex pointer-events-none', positions[position], $attrs.class)">
    <span
      class="font-bold uppercase tracking-widest whitespace-nowrap"
      :style="{ fontSize: `${fontSize}pt`, color: `color-mix(in srgb, ${resolve(color)} ${Math.round(opacity * 100)}%, transparent)`, transform: `rotate(${angle}deg)` }"
    >{{ text }}</span>
  </div>
</template>
