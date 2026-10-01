<script>
import { PackingSlipFooter } from "../footers.js";
import { docPage } from "../doc.js";
/** Recommended render options: A4, 56pt margins, footer band (customer service + "Page n of N"). */
export const renderOptions = { ...docPage, footer: PackingSlipFooter };
</script>

<script setup>
import { computed } from "vue";
import { cn, rest } from "../../lib/ui.js";
import PageHeader from "../../components/PageHeader/PageHeader.vue";
import Section from "../../components/Section/Section.vue";
import Text from "../../components/Text/Text.vue";
import KeyValue from "../../components/KeyValue/KeyValue.vue";
import DataTable from "../../components/DataTable/DataTable.vue";
import Label from "../shared/Label.vue";
import Mark from "../shared/Mark.vue";
import { blockVars, money } from "../invoice.js";
import { packingSlipSample } from "../doc.js";

defineOptions({ inheritAttrs: false });
// `data`: pdfcn's PackingSlipProps. Line totals use the PACKED quantity; "Items Packed x of y" is derived from the items.
const props = defineProps({ data: { type: Object, default: () => packingSlipSample }, currency: { type: String, default: "USD" }, locale: { type: String, default: "en-US" } });
const fmt = (n) => money(n, props);
const addr = (a) => `${a.address}, ${a.city}, ${a.state} ${a.zip}${a.country ? `, ${a.country}` : ""}`;
const rows = computed(() => props.data.items.map((i) => ({ name: i.name, sku: i.sku, packed: i.qtyPacked, ordered: i.qtyOrdered, unit: fmt(i.unitPrice), total: fmt(Math.round(i.qtyPacked * i.unitPrice * 100) / 100) })));
const columns = [{ key: "name", header: "Item" }, { key: "sku", header: "SKU", align: "center" }, { key: "packed", header: "Packed", align: "center" }, { key: "ordered", header: "Ordered", align: "center" }, { key: "unit", header: "Unit Price", align: "right" }, { key: "total", header: "Total", align: "right" }];
const packed = computed(() => props.data.items.reduce((s, i) => s + i.qtyPacked, 0)), ordered = computed(() => props.data.items.reduce((s, i) => s + i.qtyOrdered, 0));
const summary = computed(() => [{ key: "Items Packed", value: `${packed.value} of ${ordered.value}` }, ...(props.data.totalPackages === undefined ? [] : [{ key: "Packages", value: String(props.data.totalPackages) }]), ...(props.data.totalWeight ? [{ key: "Total Weight", value: props.data.totalWeight }] : [])]);
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('flex flex-col', $attrs.class)" :style="[$attrs.style, blockVars]">
    <PageHeader variant="logo-left" title="PACKING SLIP" :subtitle="data.companyName" :right-text="data.orderNumber" :right-sub-text="`Order Date: ${data.orderDate}`" :margin-bottom="0">
      <template #logo><Mark :logo="data.companyLogo" :name="data.companyName" /></template>
    </PageHeader>
    <Section no-wrap class="mt-7 mb-8 flex-row">
      <div class="flex-1 pr-[15pt]"><Label>Ship To</Label><Text variant="xs" no-margin>{{ data.shipTo.name }}</Text><Text variant="xs" no-margin>{{ addr(data.shipTo) }}</Text><Text v-if="data.shipTo.phone" variant="xs" no-margin>{{ data.shipTo.phone }}</Text></div>
      <div class="flex-1 pr-[15pt]"><Label>From</Label><Text variant="xs" no-margin>{{ data.shipFrom.name }}</Text><Text variant="xs" no-margin>{{ addr(data.shipFrom) }}</Text></div>
      <div class="flex-1 pr-[15pt]"><Label>Order</Label><Text variant="xs" no-margin>{{ data.orderNumber }}</Text><Text v-if="data.poNumber" variant="xs" no-margin>PO: {{ data.poNumber }}</Text></div>
    </Section>
    <DataTable variant="grid" stripe :columns="columns" :data="rows" />
    <Section no-wrap spacing="none" class="mt-4 flex-row">
      <div class="flex-1 pr-[15pt]"><Label>Shipping</Label><Text variant="xs" no-margin>{{ data.shipping.carrier }} — {{ data.shipping.method }}</Text><Text variant="xs" no-margin>Tracking: {{ data.shipping.trackingNumber }}</Text><Text v-if="data.shipping.estimatedDelivery" variant="xs" no-margin>Est. Delivery: {{ data.shipping.estimatedDelivery }}</Text></div>
      <div class="ml-auto w-[220pt]"><KeyValue size="sm" divided :divider-thickness="1" :items="summary" /></div>
    </Section>
    <Section v-if="data.thankYouMessage || data.returnsPolicy" spacing="sm" variant="highlight" :accent-color="data.accentColor" class="mt-9">
      <Text v-if="data.thankYouMessage" variant="sm" weight="medium" no-margin>{{ data.thankYouMessage }}</Text>
      <Text v-if="data.returnsPolicy" variant="xs" color="muted-foreground" no-margin>{{ data.returnsPolicy }}</Text>
    </Section>
  </div>
</template>
