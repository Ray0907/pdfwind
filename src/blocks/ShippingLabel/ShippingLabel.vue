<script>
import { shippingLabelPage } from "../doc.js";
/** Recommended render options: a 4in x 6in single page (384 x 576 CSS px = 288 x 432 pt), no margin. */
export const renderOptions = { ...shippingLabelPage };
</script>

<script setup>
import { computed } from "vue";
import { cn, rest, color } from "../../lib/ui.js";
import QRCode from "../../components/QRCode/QRCode.vue";
import PdfImage from "../../components/PdfImage/PdfImage.vue";
import { shippingLabelSample } from "../doc.js";

defineOptions({ inheritAttrs: false });
// `data`: pdfcn's ShippingLabelData. The QR encodes trackingNumber unless `barcodeUrl` (an image) is given; postage defaults to "PAID".
const props = defineProps({ data: { type: Object, default: () => shippingLabelSample } });
const accent = computed(() => color(props.data.accentColor ?? "primary"));
const city = (p) => `${p.city}, ${p.state} ${p.zip}${p.country ? `, ${p.country}` : ""}`;
const details = computed(() => [...(props.data.weight ? [["Weight", props.data.weight]] : []), ...(props.data.dimensions ? [["Dimensions", props.data.dimensions]] : []), ...(typeof props.data.packageCount === "number" ? [["Packages", String(props.data.packageCount)]] : []), ["Postage", props.data.postage ?? "PAID"]]);
const sec = "mb-1 text-[8pt] font-bold uppercase tracking-[0.5pt] leading-[1.65]";
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('flex h-[432pt] w-[288pt] flex-col overflow-hidden bg-background p-2', $attrs.class)">
    <div class="flex flex-1 flex-col border-[2pt] border-foreground p-2.5">
      <div class="flex flex-row items-center justify-between"><div class="text-[16pt] font-bold leading-[1.65]">{{ data.carrier }}</div><div :class="sec" :style="{ color: accent }">{{ data.serviceLevel }}</div></div>
      <div class="my-1.5 h-[2pt] bg-foreground" />
      <div class="flex flex-1 flex-row">
        <div class="flex-[1.4] border-r-[2pt] border-foreground pr-3"><div :class="sec" :style="{ color: accent }">Ship To</div>
          <div class="text-xs font-bold leading-body">{{ data.to.name }}</div><div class="text-xs leading-body">{{ data.to.address }}</div><div class="text-xs leading-body">{{ city(data.to) }}</div><div v-if="data.to.phone" class="text-xs leading-body text-muted-foreground">{{ data.to.phone }}</div></div>
        <div class="flex-1 pl-3"><div :class="sec" :style="{ color: accent }">From</div>
          <div class="text-xs font-bold leading-body">{{ data.from.name }}</div><div class="text-xs leading-body">{{ data.from.address }}</div><div class="text-xs leading-body">{{ city(data.from) }}</div></div>
      </div>
      <div class="my-1.5 h-[2pt] bg-foreground" />
      <div class="border-[2pt] border-foreground">
        <div v-for="([k, v], i) in details" :key="k" :class="['flex flex-row items-center px-2 py-[3pt]', i < details.length - 1 && 'border-b-[1pt] border-border']"><div class="w-[84pt] text-[8pt] font-bold uppercase tracking-[0.5pt] text-muted-foreground">{{ k }}</div><div class="flex-1 text-xs">{{ v }}</div></div>
      </div>
      <div v-if="data.handlingLabels?.length" class="mt-2 flex flex-row flex-wrap gap-1.5"><div v-for="(l, i) in data.handlingLabels" :key="i" class="bg-foreground px-2 py-1 text-[8pt] font-bold uppercase tracking-[0.5pt] text-background">{{ l }}</div></div>
      <div class="mt-2.5 flex flex-col items-center">
        <PdfImage v-if="data.barcodeUrl" :src="data.barcodeUrl" fit="contain" :height="72" width="100%" />
        <QRCode v-else :value="data.trackingNumber" :size="80" color="#000000" background-color="#ffffff" />
        <div class="mt-1.5 text-xs font-bold uppercase tracking-[0.6pt]">{{ data.trackingNumber }}</div>
      </div>
    </div>
  </div>
</template>
