<script>
import ReportFooter from "../shared/ReportFooter.vue";
import { reportPage } from "../report.js";
/** Recommended render options: A4, 48pt margins, repeating footer band with "Page n of N". */
export const renderOptions = { ...reportPage, footer: ReportFooter };
</script>

<script setup>
import ReportLayout from "../shared/ReportLayout.vue";
import { reportSecuritySample } from "../report.js";

// Props: `data` (pdfcn's BaseReportData shape, neutral sample by default) and any ReportLayout override
// (statusLabel, statusTone, graphVariant, graphTitle, graphSubtitle, graphData, graphColors, ...). Class passthrough on the root.
defineProps({ data: { type: Object, default: () => reportSecuritySample } });
</script>

<template>
  <ReportLayout :data="data" title-prefix="Security Report" status-label="Security: Action Needed" status-tone="destructive" graph-variant="donut" graph-title="Open risk distribution" graph-subtitle="High/Medium/Low workload share" :graph-show-values="true" :graph-colors='["#DC2626", "#F59E0B", "#16A34A", "#0EA5E9"]' :graph-data='[{ label: "High Risk", value: 14 }, { label: "Medium Risk", value: 17 }, { label: "Low Risk", value: 8 }, { label: "Info", value: 4 }]' />
</template>
