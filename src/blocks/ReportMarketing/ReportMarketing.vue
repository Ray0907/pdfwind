<script>
import ReportFooter from "../shared/ReportFooter.vue";
import { reportPage } from "../report.js";
/** Recommended render options: A4, 48pt margins, repeating footer band with "Page n of N". */
export const renderOptions = { ...reportPage, footer: ReportFooter };
</script>

<script setup>
import ReportLayout from "../shared/ReportLayout.vue";
import { reportMarketingSample } from "../report.js";

// Props: `data` (pdfcn's BaseReportData shape, neutral sample by default) and any ReportLayout override
// (statusLabel, statusTone, graphVariant, graphTitle, graphSubtitle, graphData, graphColors, ...). Class passthrough on the root.
defineProps({ data: { type: Object, default: () => reportMarketingSample } });
</script>

<template>
  <ReportLayout :data="data" title-prefix="Growth Report" status-label="Growth: Strong" status-tone="success" graph-variant="bar" graph-title="Pipeline build by week" graph-subtitle="Demand creation output trend" :graph-show-values="true" :graph-colors='["success"]' />
</template>
