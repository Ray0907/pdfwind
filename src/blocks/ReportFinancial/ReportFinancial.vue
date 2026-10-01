<script>
import ReportFooter from "../shared/ReportFooter.vue";
import { reportPage } from "../report.js";
/** Recommended render options: A4, 48pt margins, repeating footer band with "Page n of N". */
export const renderOptions = { ...reportPage, footer: ReportFooter };
</script>

<script setup>
import ReportLayout from "../shared/ReportLayout.vue";
import { reportFinancialSample } from "../report.js";

// Props: `data` (pdfcn's BaseReportData shape, neutral sample by default) and any ReportLayout override
// (statusLabel, statusTone, graphVariant, graphTitle, graphSubtitle, graphData, graphColors, ...). Class passthrough on the root.
defineProps({ data: { type: Object, default: () => reportFinancialSample } });
</script>

<template>
  <ReportLayout :data="data" title-prefix="Financial Report" status-label="Finance: Healthy" status-tone="success" graph-variant="line" graph-title="Revenue trajectory" graph-subtitle="Quarterly weighted revenue index" :graph-show-values="false" :graph-colors='["primary"]' />
</template>
