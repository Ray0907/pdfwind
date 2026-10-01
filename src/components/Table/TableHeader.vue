<script setup>
import { provide } from "vue";
import { cn, rest } from "../../lib/ui.js";

defineOptions({ inheritAttrs: false });
provide("section", "header");
</script>

<template>
  <thead v-bind="rest($attrs)" :class="cn($attrs.class)"><slot /></thead>
</template>
