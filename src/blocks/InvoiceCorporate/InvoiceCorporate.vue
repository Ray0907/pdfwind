<script setup>
import { computed } from "vue";
import { cn, rest } from "../../lib/ui.js";
import PageHeader from "../../components/PageHeader/PageHeader.vue";
import Text from "../../components/Text/Text.vue";
import KeyValue from "../../components/KeyValue/KeyValue.vue";
import DataTable from "../../components/DataTable/DataTable.vue";
import Label from "../shared/Label.vue";
import Totals from "../shared/Totals.vue";
import Mark from "../shared/Mark.vue";
import { blockVars, money, rowsOf, invoiceCorporateSample } from "../invoice.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  data: { type: Object, default: () => invoiceCorporateSample },
  currency: { type: String, default: "USD" },
  locale: { type: String, default: "en-US" },
});
const fmt = (n) => money(n, props);
const rows = computed(() => rowsOf(props.data, fmt));
const columns = [{ key: "description", header: "Description" }, { key: "quantity", header: "Qty", align: "center" }, { key: "unitPrice", header: "Unit Price", align: "right" }, { key: "amount", header: "Amount", align: "right" }];
const details = computed(() => [{ key: "Invoice #", value: props.data.invoiceNumber }, { key: "Issue Date", value: props.data.invoiceDate }, { key: "Due Date", value: props.data.dueDate }, { key: "Payment", value: props.data.paymentTerms.method }]);
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('flex flex-col', $attrs.class)" :style="[$attrs.style, blockVars]">
    <PageHeader variant="logo-right" :title="data.companyName" :subtitle="`${data.subtitle} · ${data.companyAddress}`" :margin-bottom="29">
      <template #logo><Mark :logo="data.logo" :name="data.companyName" /></template>
    </PageHeader>
    <div class="mb-[22pt] flex flex-row gap-6">
      <div class="flex-1"><Label>Invoice Details</Label><KeyValue size="sm" :items="details" /></div>
      <div class="flex-1">
        <Label>Bill To</Label>
        <Text variant="sm" weight="semibold" no-margin>{{ data.billTo.name }}</Text>
        <Text variant="xs" color="muted-foreground" no-margin>{{ data.billTo.address }}</Text>
        <Text variant="xs" color="muted-foreground" no-margin>{{ data.billTo.email }}</Text>
        <Text variant="xs" color="muted-foreground" no-margin>{{ data.billTo.phone }}</Text>
      </div>
    </div>
    <DataTable variant="bordered" :columns="columns" :data="rows" />
    <div class="mt-5 break-inside-avoid rounded-md bg-muted p-4">
      <div class="ml-auto w-[260pt]"><Totals :data="data" total-label="Total Due" total-color="primary" size="md" :big="['13pt', '14pt']" :currency="currency" :locale="locale" /></div>
    </div>
  </div>
</template>
