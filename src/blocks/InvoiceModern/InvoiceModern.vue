<script setup>
import { computed } from "vue";
import { cn, rest } from "../../lib/ui.js";
import PageHeader from "../../components/PageHeader/PageHeader.vue";
import Section from "../../components/Section/Section.vue";
import Text from "../../components/Text/Text.vue";
import DataTable from "../../components/DataTable/DataTable.vue";
import Totals from "../shared/Totals.vue";
import { blockVars, money, rowsOf, invoiceModernSample } from "../invoice.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  data: { type: Object, default: () => invoiceModernSample },
  currency: { type: String, default: "USD" },
  locale: { type: String, default: "en-US" },
});
const fmt = (n) => money(n, props);
const rows = computed(() => rowsOf(props.data, fmt));
const columns = [{ key: "description", header: "Description" }, { key: "quantity", header: "Qty", align: "center" }, { key: "unitPrice", header: "Unit Price", align: "right" }, { key: "amount", header: "Amount", align: "right" }];
const meta = "mb-[3pt] text-[8pt] font-bold uppercase tracking-[0.5pt] text-muted-foreground leading-[1.2]";
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('flex flex-col', $attrs.class)" :style="[$attrs.style, blockVars]">
    <PageHeader variant="branded" :title="data.companyName" :subtitle="`${data.subtitle} · ${data.companyAddress} · ${data.companyEmail}`" />
    <div class="mb-section flex flex-row">
      <div class="flex-1 pr-3"><div :class="meta">Invoice Number</div><div class="text-[11pt] font-bold">{{ data.invoiceNumber }}</div></div>
      <div class="flex-1 pr-3"><div :class="meta">Invoice Date</div><div class="text-[9pt]">{{ data.invoiceDate }}</div></div>
      <div class="flex-1 pr-3"><div :class="meta">Due Date</div><div class="text-[9pt]">{{ data.dueDate }}</div></div>
      <div class="mr-3 w-px bg-border" />
      <div class="flex-[2]">
        <div :class="meta">Billed To</div>
        <div class="text-[9pt] font-bold">{{ data.billTo.name }}</div>
        <div class="text-[9pt] text-muted-foreground">{{ data.billTo.address }}</div>
        <div class="text-[9pt] text-muted-foreground">{{ data.billTo.email }}</div>
        <div class="text-[9pt] text-muted-foreground">{{ data.billTo.phone }}</div>
      </div>
    </div>
    <DataTable variant="primary-header" :columns="columns" :data="rows" />
    <Section no-wrap spacing="none" class="mt-4 flex-row">
      <div class="flex-1 pr-5">
        <div :class="meta">Payment Method</div>
        <Text variant="xs" no-margin>{{ data.paymentTerms.method }}</Text>
        <Text variant="xs" color="muted-foreground" no-margin>{{ data.paymentTerms.gst }}</Text>
      </div>
      <div class="w-[220pt]"><Totals :data="data" total-label="Total Due" :currency="currency" :locale="locale" /></div>
    </Section>
  </div>
</template>
