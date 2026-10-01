<script setup>
import { cn, rest } from "../../lib/ui.js";

defineOptions({ inheritAttrs: false });
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('break-before-page', $attrs.class)" />
</template>
