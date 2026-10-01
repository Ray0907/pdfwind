<script setup>
// `.client.vue`: Nuxt never renders this on the server, so there is nothing to hydrate. <PdfPreview> renders the PDF in the browser
// with pdfwind's browser entry (the same code as the server route); changing `theme` re-renders in place.
import { computed } from "vue";
import { PdfPreview, InvoiceModern, InvoiceFooter, blockPage } from "pdfwind/browser";

const props = defineProps({ theme: { type: String, default: "default" }, data: { type: Object, required: true }, currency: { type: String, default: "USD" } });
const options = computed(() => ({ ...blockPage, footer: InvoiceFooter, theme: props.theme }));
const docProps = computed(() => ({ data: props.data, currency: props.currency }));
</script>

<template>
  <PdfPreview :component="InvoiceModern" :props="docProps" :options="options" class="preview" />
</template>
