<script setup>
import { computed } from "vue";
import Table from "../Table/Table.vue";
import TableHeader from "../Table/TableHeader.vue";
import TableBody from "../Table/TableBody.vue";
import TableFooter from "../Table/TableFooter.vue";
import TableRow from "../Table/TableRow.vue";
import TableCell from "../Table/TableCell.vue";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  columns: { type: Array, required: true }, // [{ key, header, align?, width?, render?(value, row), renderFooter?(value) }]
  data: { type: Array, required: true }, // array of row objects
  variant: { type: String, default: "grid" }, // any Table variant
  footer: Object, // { [columnKey]: value }
  stripe: Boolean,
  size: { type: String, default: "default" }, // default | compact
  noWrap: Boolean,
});

const show = (v) => (v === null || v === undefined ? "" : String(v));
// compact size = the compact cell metrics on whatever variant is chosen (pdfcn: smaller padding + 10pt text)
const compact = computed(() => props.size === "compact");
const cellClass = computed(() => (compact.value ? "px-2 py-0.5 text-xs" : ""));
const headClass = computed(() => (compact.value ? "px-2 py-0.5 text-xs normal-case tracking-normal" : "")); // pdfcn: compact DataTable headers are not uppercased
</script>

<template>
  <!-- cell content: column.render(value, row) (string or VNode), else slot #cell-<key>="{ value, row }", else the plain value -->
  <Table v-bind="$attrs" :variant="variant" :zebra-stripe="stripe" :no-wrap="noWrap">
    <TableHeader>
      <TableRow>
        <TableCell v-for="col in columns" :key="col.key" :align="col.align ?? 'left'" :width="col.width" :class="headClass">{{ col.header }}</TableCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow v-for="(row, i) in data" :key="i">
        <TableCell v-for="col in columns" :key="col.key" :align="col.align ?? 'left'" :width="col.width" :class="cellClass">
          <component :is="() => col.render(row[col.key], row)" v-if="col.render" />
          <slot v-else :name="`cell-${col.key}`" :value="row[col.key]" :row="row">{{ show(row[col.key]) }}</slot>
        </TableCell>
      </TableRow>
    </TableBody>
    <TableFooter v-if="footer">
      <TableRow>
        <TableCell v-for="col in columns" :key="col.key" :align="col.align ?? 'left'" :width="col.width" :class="cellClass">
          <component :is="() => col.renderFooter(footer[col.key])" v-if="col.renderFooter" />
          <template v-else>{{ show(footer[col.key]) }}</template>
        </TableCell>
      </TableRow>
    </TableFooter>
  </Table>
</template>
