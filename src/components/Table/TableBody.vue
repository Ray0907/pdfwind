<script setup>
import { provide } from "vue";
import { cn, rest } from "../../lib/ui.js";

defineOptions({ inheritAttrs: false });
provide("section", "body");
</script>

<template>
  <tbody v-bind="rest($attrs)" :class="cn($attrs.class)"><slot /></tbody>
</template>
