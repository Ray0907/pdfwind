<script setup>
import { cn, rest } from "../../lib/ui.js";

defineOptions({ inheritAttrs: false });
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('flex flex-col break-inside-avoid', $attrs.class)"><slot /></div>
</template>
