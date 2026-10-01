<script setup>
import { invoiceModernSample } from "~~/pdfwind/src/blocks/index.js";
import { themeNames } from "~~/pdfwind/src/themes/index.js";

useHead({ title: "pdfwind in Nuxt", htmlAttrs: { lang: "en" } });
const theme = ref("default");
const number = ref("INV-2026-002");
const client = ref("TechStart Solutions");
// the same data the server route builds from its query string
const data = computed(() => ({ ...invoiceModernSample, invoiceNumber: number.value || invoiceModernSample.invoiceNumber, billTo: { ...invoiceModernSample.billTo, name: client.value || invoiceModernSample.billTo.name } }));
const href = computed(() => `/api/invoice.pdf?${new URLSearchParams({ theme: theme.value, number: number.value, client: client.value })}`);
</script>

<template>
  <main class="page">
    <header>
      <h1>pdfwind in Nuxt</h1>
      <p>The preview is rendered in your browser; <a :href="href" data-testid="download">the same invoice from the server route</a> comes out of Nitro.</p>
    </header>
    <form class="controls" @submit.prevent>
      <label>Theme
        <select v-model="theme" data-testid="theme">
          <option v-for="t in themeNames" :key="t" :value="t">{{ t }}</option>
        </select>
      </label>
      <label>Invoice number <input v-model="number" maxlength="24" /></label>
      <label>Client <input v-model="client" maxlength="60" /></label>
    </form>
    <div class="frame">
      <InvoicePreview :theme="theme" :data="data" />
    </div>
  </main>
</template>

<style>
:root { color-scheme: light dark; }
body { margin: 0; font: 15px/1.45 system-ui, sans-serif; background: Canvas; color: CanvasText; }
.page { display: grid; gap: 12px; padding: 16px; height: 100dvh; box-sizing: border-box; grid-template-rows: auto auto 1fr; }
.page h1 { margin: 0 0 4px; font-size: 20px; }
.page p { margin: 0; }
.controls { display: flex; gap: 16px; flex-wrap: wrap; align-items: end; }
.controls label { display: grid; gap: 4px; font-size: 13px; }
.controls select, .controls input { min-height: 36px; padding: 0 8px; font: inherit; }
.frame { position: relative; min-height: 0; border: 1px solid GrayText; border-radius: 8px; overflow: hidden; }
.frame .preview { position: absolute; inset: 0; }
</style>
