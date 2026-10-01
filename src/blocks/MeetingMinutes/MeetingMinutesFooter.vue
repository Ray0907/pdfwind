<script setup>
import PageFooter from "../../components/PageFooter/PageFooter.vue";
import PageNumber from "../../components/PageNumber/PageNumber.vue";
import { blockVars } from "../invoice.js";
import { meetingMinutesSample } from "../doc.js";

// "Prepared by ..." left, "Page n of N" center, distribution list right (the block's props are { data })
defineProps({ data: { type: Object, default: () => meetingMinutesSample } });
</script>

<template>
  <PageFooter :margin-top="0" class="mb-3" :style="[blockVars, { marginLeft: '25pt', marginRight: '25pt' }]">
    <template #left>Prepared by {{ data.preparedBy }}</template>
    <template #center><PageNumber align="center" size="xs" /></template>
    <template #right><span v-if="data.distributionList?.length">Distribution: {{ data.distributionList.join(", ") }}</span></template>
  </PageFooter>
</template>
