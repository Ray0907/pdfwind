<script setup>
import { computed } from "vue";
import { cn, rest } from "../../lib/ui.js";
import PageHeader from "../../components/PageHeader/PageHeader.vue";
import Section from "../../components/Section/Section.vue";
import Text from "../../components/Text/Text.vue";
import DataTable from "../../components/DataTable/DataTable.vue";
import Label from "../shared/Label.vue";
import Totals from "../shared/Totals.vue";
import Mark from "../shared/Mark.vue";
import { blockVars, money, rowsOf, invoiceClassicSample } from "../invoice.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  data: { type: Object, default: () => invoiceClassicSample },
  currency: { type: String, default: "USD" },
  locale: { type: String, default: "en-US" },
});
const fmt = (n) => money(n, props);
const rows = computed(() => rowsOf(props.data, fmt));
const columns = [{ key: "description", header: "Description" }, { key: "quantity", header: "QTY", align: "center" }, { key: "unitPrice", header: "Rate", align: "center" }, { key: "amount", header: "Total", align: "right" }];
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('flex flex-col', $attrs.class)" :style="[$attrs.style, blockVars]">
    <PageHeader variant="logo-left" :title="data.companyName" :subtitle="data.subtitle" :right-text="data.invoiceNumber" :right-sub-text="`Due: ${data.dueDate}`" :margin-bottom="0">
      <template #logo><Mark :logo="data.logo" :name="data.companyName" /></template>
    </PageHeader>
    <Section no-wrap class="mb-8 mt-7 flex-row">
      <div class="flex-1 pr-[15pt]">
        <Label>From</Label>
        <Text variant="xs" no-margin>{{ data.companyName }}</Text><Text variant="xs" no-margin>{{ data.companyAddress }}</Text><Text variant="xs" no-margin>{{ data.companyEmail }}</Text>
      </div>
      <div class="flex-1 pr-[15pt]">
        <Label>Bill To</Label>
        <Text variant="xs" no-margin>{{ data.billTo.name }}</Text><Text variant="xs" no-margin>{{ data.billTo.address }}</Text><Text variant="xs" no-margin>{{ data.billTo.email }}</Text>
      </div>
      <div class="flex-1 pr-[15pt]">
        <Label>Payment Terms</Label>
        <Text variant="xs" no-margin>{{ data.paymentTerms.method }}</Text><Text variant="xs" no-margin>{{ data.paymentTerms.gst }}</Text><Text variant="xs" no-margin>{{ data.paymentTerms.dueDate }}</Text>
      </div>
    </Section>
    <DataTable variant="grid" stripe :columns="columns" :data="rows" />
    <Section no-wrap class="mt-4 flex-row">
      <div class="ml-auto w-[220pt]"><Totals :data="data" :currency="currency" :locale="locale" /></div>
    </Section>
  </div>
</template>
