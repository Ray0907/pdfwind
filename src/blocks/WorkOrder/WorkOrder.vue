<script>
import { WorkOrderFooter } from "../footers.js";
import { docPage } from "../doc.js";
/** Recommended render options: A4, 56pt margins, footer band (warranty text + "Page n of N"). */
export const renderOptions = { ...docPage, footer: WorkOrderFooter };
</script>

<script setup>
import { computed } from "vue";
import { cn, rest } from "../../lib/ui.js";
import PageHeader from "../../components/PageHeader/PageHeader.vue";
import Section from "../../components/Section/Section.vue";
import Text from "../../components/Text/Text.vue";
import Badge from "../../components/Badge/Badge.vue";
import KeyValue from "../../components/KeyValue/KeyValue.vue";
import DataTable from "../../components/DataTable/DataTable.vue";
import Signature from "../../components/Signature/Signature.vue";
import Label from "../shared/Label.vue";
import Mark from "../shared/Mark.vue";
import { blockVars, money } from "../invoice.js";
import { workOrderSample } from "../doc.js";

defineOptions({ inheritAttrs: false });
// `data`: pdfcn's WorkOrderData. Parts, labor, tax (data.taxRate) and the grand total are computed from the entries.
const props = defineProps({ data: { type: Object, default: () => workOrderSample }, currency: { type: String, default: "USD" }, locale: { type: String, default: "en-US" } });
const fmt = (n) => money(n, props), r2 = (n) => Math.round(n * 100) / 100;
const partsTotal = computed(() => r2(props.data.parts.reduce((s, p) => s + p.qty * p.unitPrice, 0)));
const laborTotal = computed(() => r2(props.data.labor.reduce((s, l) => s + l.hours * l.rate, 0)));
const tax = computed(() => r2((partsTotal.value + laborTotal.value) * (props.data.taxRate ?? 0)));
const grand = computed(() => r2(partsTotal.value + laborTotal.value + tax.value));
const totals = computed(() => [{ key: "Parts Total", value: fmt(partsTotal.value) }, { key: "Labor Total", value: fmt(laborTotal.value) }, { key: `Tax (${+((props.data.taxRate ?? 0) * 100).toFixed(2)}%)`, value: fmt(tax.value) }, { key: "Grand Total", value: fmt(grand.value), keyStyle: { fontSize: "12pt", fontWeight: 700 }, valueStyle: { fontSize: "12pt", fontWeight: 700 } }]);
const partRows = computed(() => props.data.parts.map((p) => ({ partNumber: p.partNumber, description: p.description, qty: p.qty, unit: fmt(p.unitPrice), total: fmt(r2(p.qty * p.unitPrice)) })));
const laborRows = computed(() => props.data.labor.map((l) => ({ description: l.description, technician: l.technician, hours: l.hours, rate: fmt(l.rate), total: fmt(r2(l.hours * l.rate)) })));
const partCols = [{ key: "partNumber", header: "Part #", width: 90 }, { key: "description", header: "Description" }, { key: "qty", header: "Qty", align: "center", width: 50 }, { key: "unit", header: "Unit Price", align: "right", width: 80 }, { key: "total", header: "Total", align: "right", width: 80 }];
const laborCols = [{ key: "description", header: "Description" }, { key: "technician", header: "Technician", width: 110 }, { key: "hours", header: "Hours", align: "center", width: 50 }, { key: "rate", header: "Rate", align: "right", width: 80 }, { key: "total", header: "Total", align: "right", width: 80 }];
const tone = { High: "warning", Low: "default", Medium: "info", Urgent: "destructive" };
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('flex flex-col', $attrs.class)" :style="[$attrs.style, blockVars]">
    <PageHeader variant="logo-left" :title="data.companyName" subtitle="Work Order" :right-text="`WO #${data.workOrderNumber}`" :right-sub-text="`Date: ${data.date}`" :margin-bottom="11">
      <template #logo><Mark :logo="data.companyLogo" :name="data.companyName" /></template>
    </PageHeader>
    <Section no-wrap spacing="none" class="mb-3 flex-row items-center justify-between">
      <div class="flex flex-row items-center gap-2"><Label class="mb-0">Priority</Label><Badge :label="data.priority" :variant="tone[data.priority]" size="sm" /></div>
      <Badge :label="data.jobType" variant="outline" size="sm" />
    </Section>
    <Section no-wrap spacing="none" class="mb-3 flex-row">
      <div class="flex-1 pr-[15pt]"><Label>Customer</Label><Text variant="xs" no-margin>{{ data.customer.name }}</Text><Text variant="xs" no-margin>{{ data.customer.address }}</Text><Text variant="xs" no-margin>{{ data.customer.phone }}</Text><Text v-if="data.customer.email" variant="xs" no-margin>{{ data.customer.email }}</Text><Text v-if="data.customer.accountNumber" variant="xs" no-margin>Acct #: {{ data.customer.accountNumber }}</Text></div>
      <div class="flex-1 pr-[15pt]"><Label>Job Info</Label><Text variant="xs" no-margin>Technician: {{ data.technician }}</Text><Text variant="xs" no-margin>Job Type: {{ data.jobType }}</Text></div>
      <div class="flex-1 pr-[15pt]"><Label>Equipment</Label><Text variant="xs" no-margin>{{ data.equipment.description }}</Text><Text v-if="data.equipment.makeModel" variant="xs" no-margin>{{ data.equipment.makeModel }}</Text><Text v-if="data.equipment.serialNumber" variant="xs" no-margin>S/N: {{ data.equipment.serialNumber }}</Text><Text v-if="data.equipment.location" variant="xs" no-margin>Location: {{ data.equipment.location }}</Text></div>
    </Section>
    <Section spacing="none"><Label>Parts Used</Label><DataTable variant="grid" stripe :columns="partCols" :data="partRows" /></Section>
    <Section spacing="none"><Label>Labor</Label><DataTable variant="grid" stripe :columns="laborCols" :data="laborRows" /></Section>
    <Section no-wrap spacing="none" class="mb-component flex-row">
      <div class="flex-1 pr-[15pt]"><div v-if="data.technicianNotes"><Label>Technician Notes</Label><Text variant="xs" no-margin>{{ data.technicianNotes }}</Text></div></div>
      <div class="ml-auto w-[200pt]"><KeyValue size="sm" divided :divider-thickness="1" :items="totals" /></div>
    </Section>
    <Section v-if="data.customerNotes" spacing="none" class="mb-component mt-0"><Label>Customer Notes</Label><Text variant="xs" no-margin>{{ data.customerNotes }}</Text></Section>
    <Section no-wrap spacing="none">
      <Signature variant="double" class="mb-0 mt-0" :signers="[{ label: 'Customer Signature', date: data.date }, { label: 'Technician Signature', name: data.technician, date: data.date }]" />
      <div class="mt-component flex flex-row items-center gap-1.5"><div class="size-[10pt] border-[1pt] border-foreground" /><Text variant="xs" no-margin>Customer approves work performed and charges above</Text></div>
    </Section>
  </div>
</template>
