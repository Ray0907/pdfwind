<script setup>
import { computed } from "vue";
import { cn, rest } from "../../lib/ui.js";
import Section from "../../components/Section/Section.vue";
import Text from "../../components/Text/Text.vue";
import DataTable from "../../components/DataTable/DataTable.vue";
import Badge from "../../components/Badge/Badge.vue";
import Label from "../shared/Label.vue";
import Totals from "../shared/Totals.vue";
import { blockVars, money, invoiceConsultantSample } from "../invoice.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  data: { type: Object, default: () => invoiceConsultantSample },
  currency: { type: String, default: "USD" },
  locale: { type: String, default: "en-US" },
});
const fmt = (n) => money(n, props);
const services = computed(() => props.data.services);
const totalHours = computed(() => services.value.reduce((s, x) => s + x.hours, 0));
const rows = computed(() => services.value.map((s) => ({ description: s.description, hours: s.hours, rate: fmt(s.rate), amount: fmt(Math.round(s.hours * s.rate * 100) / 100) })));
const columns = [{ key: "description", header: "Service Description" }, { key: "hours", header: "Hours", align: "center" }, { key: "rate", header: "Rate ($/hr)", align: "right" }, { key: "amount", header: "Amount", align: "right" }];
const items = computed(() => services.value.map((s) => ({ quantity: s.hours, unitPrice: s.rate })));
const label = "pb-1 border-b-[1pt] border-border";
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('flex flex-col', $attrs.class)" :style="[$attrs.style, blockVars]">
    <div class="mb-[30pt] flex flex-row items-start justify-between border-b-[2pt] border-primary pb-component">
      <div class="flex-1">
        <Text variant="xl" weight="bold" no-margin>{{ data.companyName }}</Text>
        <Text variant="sm" color="muted-foreground" no-margin>{{ data.subtitle }}</Text>
        <Text variant="xs" color="muted-foreground" no-margin>{{ data.companyAddress }}</Text>
      </div>
      <div class="flex flex-col items-end">
        <Text variant="xs" color="muted-foreground" transform="uppercase" no-margin>Invoice</Text>
        <Text variant="lg" weight="bold" no-margin>{{ data.invoiceNumber }}</Text>
        <Text variant="xs" color="muted-foreground" no-margin>{{ data.invoiceDate }}</Text>
        <Text variant="xs" color="muted-foreground" no-margin>Due: {{ data.dueDate }}</Text>
      </div>
    </div>
    <div v-if="data.projectRef" class="mb-[30pt] flex flex-row items-center gap-2 rounded-sm bg-muted px-2.5 py-1.5">
      <Text variant="xs" weight="semibold" color="muted-foreground" no-margin>Project Reference:</Text>
      <Text variant="xs" weight="bold" no-margin>{{ data.projectRef }}</Text>
    </div>
    <div class="mb-[30pt] flex flex-row gap-10">
      <div class="flex-1">
        <Label color="primary" :class="label">From (Consultant)</Label>
        <Text variant="sm" weight="semibold" no-margin>{{ data.consultant.name }}</Text>
        <Text variant="xs" color="muted-foreground" no-margin>{{ data.consultant.title }}</Text>
        <Text variant="xs" color="muted-foreground" no-margin>{{ data.consultant.email }}</Text>
      </div>
      <div class="flex-1">
        <Label color="primary" :class="label">Bill To (Client)</Label>
        <Text variant="sm" weight="semibold" no-margin>{{ data.client.name }}</Text>
        <Text variant="xs" color="muted-foreground" no-margin>{{ data.client.company }}</Text>
        <Text variant="xs" color="muted-foreground" no-margin>{{ data.client.address }}</Text>
        <Text variant="xs" color="muted-foreground" no-margin>{{ data.client.email }}</Text>
      </div>
    </div>
    <DataTable variant="line" :columns="columns" :data="rows" />
    <Section no-wrap spacing="none" class="mt-5 flex-row">
      <div class="flex-1 pr-6">
        <Badge variant="primary" size="sm" :label="`Total Hours: ${totalHours}`" class="rounded-sm border-0 px-3 py-2 text-[9pt]" />
        <Text variant="xs" color="muted-foreground" class="mt-2">Payment: {{ data.paymentTerms.method }}</Text>
      </div>
      <div class="w-[250pt]"><Totals :data="data" :items="items" total-label="Amount Due" total-color="primary" :currency="currency" :locale="locale" :big="['13pt', '14pt']" /></div>
    </Section>
    <Section v-if="data.notes" spacing="none" variant="callout" accent-color="info" class="mt-4 bg-muted py-3.5 pl-3">
      <Text variant="xs" color="muted-foreground" no-margin>{{ data.notes }}</Text>
    </Section>
  </div>
</template>
