<script setup>
import PageFooter from "../../components/PageFooter/PageFooter.vue";
import PageNumber from "../../components/PageNumber/PageNumber.vue";
import { blockVars } from "../invoice.js";
import { medicalIntakeFormSample } from "../doc.js";

// form version + clinic address left, clinic phone center, "Page n of N" right (the block's props are { data })
defineProps({ data: { type: Object, default: () => medicalIntakeFormSample } });
</script>

<template>
  <PageFooter variant="three-column" left-text="Form v1.0 · Revised 09/2026" :address="data.clinicAddress" :phone="data.clinicPhone" :margin-top="0" class="mb-3" :style="[blockVars, { marginLeft: '48pt', marginRight: '48pt' }]">
    <template #right><PageNumber align="right" size="xs" /></template>
  </PageFooter>
</template>
