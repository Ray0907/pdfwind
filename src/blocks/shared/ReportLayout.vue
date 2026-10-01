<script setup>
import { computed } from "vue";
import { cn, rest, color } from "../../lib/ui.js";
import PageBreak from "../../components/PageBreak/PageBreak.vue";
import Section from "../../components/Section/Section.vue";
import Text from "../../components/Text/Text.vue";
import Badge from "../../components/Badge/Badge.vue";
import Graph from "../../components/Graph/Graph.vue";
import DataTable from "../../components/DataTable/DataTable.vue";
import List from "../../components/List/List.vue";
import KeyValue from "../../components/KeyValue/KeyValue.vue";
import { blockVars } from "../invoice.js";

// Three-page report (summary / chart + table / highlights) shared by the four report blocks. The page breaks are explicit.
defineOptions({ inheritAttrs: false });
const props = defineProps({
  data: { type: Object, required: true },
  titlePrefix: { type: String, default: "Report" },
  statusLabel: String,
  statusTone: { type: String, default: "success" }, // success | warning | destructive | info
  graphVariant: { type: String, default: "line" },
  graphTitle: String,
  graphSubtitle: String,
  graphLegend: { type: String, default: "none" },
  graphShowValues: Boolean,
  graphColors: Array,
  graphData: Array, // defaults to data.series
});

const heights = { line: 195, bar: 184, donut: 193, pie: 191, area: 191, "horizontal-bar": 163 };
const rows = computed(() => props.data.rows);
const avg = computed(() => Math.round(rows.value.reduce((s, r) => s + r.progress, 0) / Math.max(rows.value.length, 1)));
const columns = [{ header: "Stream", key: "label" }, { header: "Owner", key: "owner" }, { align: "center", header: "Status", key: "status" }, { align: "right", header: "Progress", key: "progress", render: (v) => `${v}%` }, { align: "right", header: "Risk", key: "risk" }];
const footer = computed(() => ({ label: "Totals", owner: "-", status: "-", progress: `${avg.value}%`, risk: "-" }));
const kv = computed(() => [{ key: "Open Risks", value: String(rows.value.filter((r) => r.risk !== "Low").length) }, { key: "On-Track Streams", value: `${rows.value.filter((r) => r.status === "On Track").length}/${rows.value.length}` }, { key: "Avg Progress", value: `${avg.value}%` }]);
const items = computed(() => props.data.highlights.map((text) => ({ text, checked: true })));
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('flex flex-col', $attrs.class)" :style="[$attrs.style, blockVars]">
    <!-- page 1: header + executive summary -->
    <div class="mb-3.5 flex flex-row items-start justify-between border-b-[1pt] border-border pb-4">
      <div class="flex-1 pr-4">
        <div class="text-[20pt] font-bold leading-[1.25]">{{ data.title }}</div>
        <div class="mt-1 text-xs text-muted-foreground">{{ titlePrefix }} · {{ data.subtitle }}</div>
      </div>
      <div class="flex flex-col items-end"><div class="text-body font-medium">{{ data.period }}</div><div class="mt-1 text-xs text-muted-foreground">Generated {{ data.generatedAt }}</div></div>
    </div>
    <div class="mb-2 flex flex-row items-center justify-between">
      <Badge :label="statusLabel" :variant="statusTone" size="sm" />
      <Text variant="xs" color="muted-foreground" no-margin>Author: {{ data.author }}</Text>
    </div>
    <Section variant="card" padding="md" no-wrap>
      <Text variant="sm" transform="uppercase" color="muted-foreground">Executive Summary</Text>
      <div class="flex flex-row flex-wrap gap-2">
        <div v-for="m in data.summary" :key="m.label" class="w-[48.6%] rounded-md border-[1pt] border-border bg-background p-2.5" :style="{ borderLeftWidth: '3pt', borderLeftColor: color(m.tone ?? statusTone) }">
          <Text no-margin class="mb-0.5 text-[8pt] uppercase tracking-[0.5pt]" color="muted-foreground">{{ m.label }}</Text>
          <Text no-margin class="mb-0.5 text-[14pt] font-bold">{{ m.value }}</Text>
          <Badge v-if="m.trend" :label="m.trend" size="sm" :variant="m.tone ?? 'info'" />
        </div>
      </div>
    </Section>
    <PageBreak />
    <!-- page 2: chart + table -->
    <Section padding="md" no-wrap class="mt-0">
      <Text variant="sm" transform="uppercase" color="muted-foreground">Performance Trend</Text>
      <div class="rounded-md border-[1pt] border-border bg-background p-3">
        <Graph :variant="graphVariant" :data="graphData ?? data.series" :title="graphTitle" :subtitle="graphSubtitle" :width="441" :height="heights[graphVariant]" :show-grid="graphVariant !== 'pie' && graphVariant !== 'donut'" :show-values="graphShowValues" :smooth="graphVariant === 'line' || graphVariant === 'area'" :legend="graphLegend" :colors="graphColors" class="mb-0" />
      </div>
    </Section>
    <Section padding="md">
      <Text variant="sm" transform="uppercase" color="muted-foreground">Delivery Table</Text>
      <DataTable variant="compact" size="compact" stripe :columns="columns" :data="rows" :footer="footer" />
    </Section>
    <PageBreak />
    <!-- page 3: highlights -->
    <Section padding="md" variant="card" no-wrap class="mt-0">
      <Text variant="sm" transform="uppercase" color="muted-foreground">Highlights &amp; Risks</Text>
      <div class="flex flex-row items-start gap-2.5">
        <div class="flex-1"><List variant="checklist" :items="items" gap="sm" /></div>
        <div class="flex-1"><KeyValue size="sm" divided :items="kv" /></div>
      </div>
    </Section>
  </div>
</template>
