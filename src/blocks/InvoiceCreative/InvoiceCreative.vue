<script setup>
import { computed } from "vue";
import { cn, rest } from "../../lib/ui.js";
import PageHeader from "../../components/PageHeader/PageHeader.vue";
import Section from "../../components/Section/Section.vue";
import Text from "../../components/Text/Text.vue";
import KeyValue from "../../components/KeyValue/KeyValue.vue";
import DataTable from "../../components/DataTable/DataTable.vue";
import Label from "../shared/Label.vue";
import Totals from "../shared/Totals.vue";
import { blockVars, money, rowsOf, invoiceCreativeSample } from "../invoice.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  data: { type: Object, default: () => invoiceCreativeSample },
  accent: { type: String, default: "#3b82f6" }, // the creative invoice's accent color (labels, bar, total)
  currency: { type: String, default: "USD" },
  locale: { type: String, default: "en-US" },
});
const fmt = (n) => money(n, props);
const rows = computed(() => rowsOf(props.data, fmt));
const columns = [{ key: "description", header: "Deliverable" }, { key: "quantity", header: "Qty", align: "center" }, { key: "unitPrice", header: "Rate", align: "right" }, { key: "amount", header: "Amount", align: "right" }];
const info = computed(() => [{ key: "Issue Date", value: props.data.invoiceDate }, { key: "Due Date", value: props.data.dueDate }, { key: "Payment", value: props.data.paymentTerms.method }]);
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('flex flex-col', $attrs.class)" :style="[$attrs.style, blockVars, { '--accent': accent }]">
    <div class="mb-section flex flex-row items-center justify-between">
      <div class="flex-1"><PageHeader variant="centered" :title="data.companyName" :subtitle="`${data.subtitle} · ${data.companyAddress}`" :margin-bottom="0" /></div>
      <div class="flex flex-col items-center rounded-md bg-primary px-5 py-3.5">
        <div class="mb-0.5 text-[8pt] font-bold uppercase tracking-[1.2pt] text-primary-foreground">Invoice</div>
        <div class="text-[16pt] font-bold text-primary-foreground">{{ data.invoiceNumber }}</div>
      </div>
    </div>
    <Section spacing="none" variant="highlight" accent-color="accent" class="mb-section py-2.5 pl-3.5">
      <div class="flex flex-row gap-8">
        <div class="flex-1">
          <Label color="accent">Billed To</Label>
          <Text variant="sm" weight="semibold" no-margin>{{ data.billTo.name }}</Text>
          <Text variant="xs" color="muted-foreground" no-margin>{{ data.billTo.address }}</Text>
          <Text variant="xs" color="muted-foreground" no-margin>{{ data.billTo.email }} · {{ data.billTo.phone }}</Text>
        </div>
        <div class="flex-1"><Label color="accent">Invoice Info</Label><KeyValue size="sm" :items="info" /></div>
      </div>
    </Section>
    <DataTable variant="striped" stripe :columns="columns" :data="rows" />
    <Section no-wrap spacing="none" class="mt-6 flex-row">
      <div class="flex-1 pr-5">
        <Label color="accent">Notes &amp; Terms</Label>
        <Text variant="xs" color="muted-foreground">{{ data.notes }}</Text>
        <Text variant="xs" color="muted-foreground" class="mt-1">{{ data.paymentTerms.gst }}</Text>
      </div>
      <div class="w-[240pt] rounded-sm bg-muted p-3.5"><Totals :data="data" total-color="accent" :big="['13pt', '14pt']" :currency="currency" :locale="locale" /></div>
    </Section>
  </div>
</template>
