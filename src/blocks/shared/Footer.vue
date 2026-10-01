<script setup>
import PageFooter from "../../components/PageFooter/PageFooter.vue";
import PageNumber from "../../components/PageNumber/PageNumber.vue";
import { blockVars } from "../invoice.js";

// Repeating footer band: pass it as renderPdf's `footer` option (it receives the same props as the block, i.e. { data }).
// Left text + "Page n of N" on every page.
defineProps({ data: { type: Object, default: () => ({}) }, variant: { type: String, default: "simple" }, inset: { type: Number, default: 25 }, lift: { type: Number, default: 12 }, text: String, rightText: String }); // rightText replaces the page counter // inset: side margin in pt; lift: space under the band in pt; text overrides the left text
</script>

<template>
  <PageFooter :variant="variant" :left-text="text ?? data.footerText ?? data.notes" :margin-top="0" class="" :style="[blockVars, { marginLeft: `${inset}pt`, marginRight: `${inset}pt`, marginBottom: `${lift}pt` }]">
    <template #right><span v-if="rightText">{{ rightText }}</span><PageNumber v-else :align="variant === 'centered' ? 'center' : 'right'" size="xs" /></template>
  </PageFooter>
</template>
