<script>
import ReportFooter from "../shared/ReportFooter.vue";
import { reportPage } from "../report.js";
/** Recommended render options: A4, 48pt margins, repeating footer band with "Page n of N". */
export const renderOptions = { ...reportPage, footer: ReportFooter };
</script>

<script setup>
import ReportLayout from "../shared/ReportLayout.vue";
import { reportOperationsSample } from "../report.js";

// Props: `data` (pdfcn's BaseReportData shape, neutral sample by default) and any ReportLayout override
// (statusLabel, statusTone, graphVariant, graphTitle, graphSubtitle, graphData, graphColors, ...). Class passthrough on the root.
defineProps({ data: { type: Object, default: () => reportOperationsSample } });
</script>

<template>
  <ReportLayout :data="data" title-prefix="Operations Report" status-label="Ops: Watch" status-tone="warning" graph-variant="horizontal-bar" graph-title="Throughput by week" graph-subtitle="Resolved workload distribution" :graph-show-values="true" :graph-colors='["info"]' :graph-data='[{ label: "Incident", value: 66 }, { label: "Automation", value: 77 }, { label: "L2 Support", value: 85 }, { label: "L1 Support", value: 91 }]' />
</template>
