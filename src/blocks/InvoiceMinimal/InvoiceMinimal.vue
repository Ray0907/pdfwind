<script setup>
import { computed } from "vue";
import { cn, rest } from "../../lib/ui.js";
import PageHeader from "../../components/PageHeader/PageHeader.vue";
import Section from "../../components/Section/Section.vue";
import Text from "../../components/Text/Text.vue";
import KeyValue from "../../components/KeyValue/KeyValue.vue";
import DataTable from "../../components/DataTable/DataTable.vue";
import Totals from "../shared/Totals.vue";
import { blockVars, money, rowsOf, invoiceMinimalSample } from "../invoice.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  data: { type: Object, default: () => invoiceMinimalSample },
  currency: { type: String, default: "USD" },
  locale: { type: String, default: "en-US" },
});
const fmt = (n) => money(n, props);
const rows = computed(() => rowsOf(props.data, fmt));
const columns = [{ key: "description", header: "Description" }, { key: "quantity", header: "Qty", align: "center" }, { key: "unitPrice", header: "Rate", align: "right" }, { key: "amount", header: "Total", align: "right" }];
const details = computed(() => [{ key: "Due Date", value: props.data.dueDate }, { key: "Payment", value: props.data.paymentTerms.method }, { key: "Tax ID", value: props.data.paymentTerms.gst }]);
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('flex flex-col', $attrs.class)" :style="[$attrs.style, blockVars]">
    <Section no-wrap spacing="none" class="mb-section flex-row items-start">
      <div class="flex-1"><PageHeader variant="minimal" :title="data.companyName" :subtitle="`${data.companyAddress} · ${data.companyEmail}`" :margin-bottom="0" /></div>
      <div class="self-start rounded-sm border-[2pt] border-primary px-3 py-2 text-right">
        <div class="text-[7pt] font-bold uppercase leading-[1.65] text-primary">Invoice</div>
        <div class="text-[14pt] font-bold leading-[1.65] text-foreground">{{ data.invoiceNumber }}</div>
        <div class="text-[8pt] leading-[1.65] text-muted-foreground">{{ data.invoiceDate }}</div>
      </div>
    </Section>
    <div class="mb-section flex flex-row">
      <div class="w-1/2 pr-5">
        <div class="mb-1 text-[8pt] font-bold uppercase tracking-[0.5pt] text-primary">Bill To</div>
        <Text variant="sm" no-margin>{{ data.billTo.name }}</Text>
        <Text variant="xs" color="muted-foreground" no-margin>{{ data.billTo.address }}</Text>
        <Text variant="xs" color="muted-foreground" no-margin>{{ data.billTo.email }}</Text>
        <Text variant="xs" color="muted-foreground" no-margin>{{ data.billTo.phone }}</Text>
      </div>
      <div class="w-1/2">
        <div class="mb-1 text-[8pt] font-bold uppercase tracking-[0.5pt] text-primary">Invoice Details</div>
        <KeyValue size="sm" :items="details" />
      </div>
    </div>
    <DataTable variant="compact" :columns="columns" :data="rows" />
    <Section no-wrap spacing="none" class="mt-5 flex-row">
      <div class="flex-1" />
      <div class="w-[240pt]"><Totals :data="data" total-label="Balance Due" total-color="primary" :big="['12pt', '13pt']" :currency="currency" :locale="locale" /></div>
    </Section>
  </div>
</template>
