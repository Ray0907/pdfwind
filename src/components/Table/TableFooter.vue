<script setup>
import { provide } from "vue";
import { cn, rest } from "../../lib/ui.js";

defineOptions({ inheritAttrs: false });
provide("section", "footer");
</script>

<template>
  <tfoot v-bind="rest($attrs)" :class="cn($attrs.class)"><slot /></tfoot>
</template>
