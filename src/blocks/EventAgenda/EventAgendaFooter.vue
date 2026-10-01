<script setup>
import PageFooter from "../../components/PageFooter/PageFooter.vue";
import PageNumber from "../../components/PageNumber/PageNumber.vue";
import { blockVars } from "../invoice.js";

// agenda footer band: Wi-Fi + organizers desk on the left, "Page n of N" on the right
defineProps({ data: { type: Object, default: () => ({}) } });
</script>

<template>
  <PageFooter :margin-top="0" class="mb-2" :style="[blockVars, { marginLeft: '32pt', marginRight: '32pt' }]">
    <template #left>
      <div v-if="data.wifiInfo" class="text-[7.5pt] font-semibold">Wi-Fi: {{ data.wifiInfo }}</div>
      <div v-if="data.emergencyContact" class="text-[7.2pt] font-normal">{{ data.emergencyContact }}</div>
    </template>
    <template #right><PageNumber align="right" size="xs" /></template>
  </PageFooter>
</template>
