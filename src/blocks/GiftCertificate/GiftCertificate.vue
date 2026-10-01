<script>
import { giftCertificatePage } from "../event.js";
/** Recommended render options: A4 portrait with 48pt margins (the certificate is a framed card at the top of the page). */
export const renderOptions = { ...giftCertificatePage };
</script>

<script setup>
import { computed } from "vue";
import { cn, rest } from "../../lib/ui.js";
import Mark from "../shared/Mark.vue";
import Text from "../../components/Text/Text.vue";
import { money } from "../invoice.js";
import { giftCertificateSample } from "../event.js";

defineOptions({ inheritAttrs: false });
// `data`: pdfcn's GiftCertificateData (amount is a number; currency "USD" by default; `locale` formats it).
const props = defineProps({ data: { type: Object, default: () => giftCertificateSample }, locale: { type: String, default: "en-US" } });
const accent = computed(() => props.data.accentColor || "#000000");
const amount = computed(() => money(props.data.amount, { currency: props.data.currency ?? "USD", locale: props.locale }));
const label = "mb-1 text-[9pt] font-bold uppercase tracking-[0.5pt] text-muted-foreground";
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('rounded-lg border-[3pt] p-4', $attrs.class)" :style="[$attrs.style, { borderColor: accent }]">
    <div class="break-inside-avoid rounded-md border-[1pt] border-dashed px-[18pt] pb-[47pt] pt-[18pt]" :style="{ borderColor: accent }">
      <div class="mb-2 flex flex-col items-center">
        <div class="mb-1.5 size-[28pt] text-[14pt]"><Mark :logo="data.companyLogo" :name="data.companyName" /></div>
        <div class="text-center text-[22pt] font-bold uppercase tracking-[1pt] leading-[1.65]" :style="{ color: accent }">Gift Certificate</div>
        <div v-if="data.companyName" class="mt-1 text-center text-[13pt] font-medium">{{ data.companyName }}</div>
      </div>
      <div class="mb-0 mt-6 flex flex-col items-center rounded-md border-[2pt] bg-muted px-5 py-3" :style="{ borderColor: accent }"><div class="text-[36pt] font-bold leading-[1.4]" :style="{ color: accent }">{{ amount }}</div></div>
      <div class="mb-2 mt-[44pt] flex flex-row gap-7">
        <div class="flex-1"><div :class="label">To</div><div class="text-[14pt] font-medium">{{ data.recipientName }}</div></div>
        <div class="flex-1"><div :class="label">From</div><div class="text-[14pt] font-medium">{{ data.senderName }}</div></div>
      </div>
      <div v-if="data.message" class="mb-2 mt-[22pt] rounded-sm bg-muted p-2.5"><Text italic align="center" no-margin class="text-[10pt] leading-[1.4]">"{{ data.message }}"</Text></div>
      <div class="my-2 flex flex-col items-center rounded-sm border-[1pt] border-border bg-background px-3.5 py-2"><div :class="label">Certificate Code</div><div class="text-[13pt] font-bold tracking-[1.2pt]">{{ data.certificateCode }}</div></div>
      <div class="mb-2 mt-[34pt] flex flex-col items-center"><div :class="label">Valid Until</div><div class="text-[12pt] font-bold" :style="{ color: accent }">{{ data.expiryDate }}</div></div>
      <div v-if="data.redemptionInstructions" class="mt-[23pt] text-center text-[9pt] leading-[1.3]">{{ data.redemptionInstructions }}</div>
      <div v-if="data.terms" class="mt-[42pt] text-center text-[8pt] leading-[1.4] text-muted-foreground">{{ data.terms }}</div>
      <div v-if="data.companyContact" class="mt-2 text-center text-[8pt] text-muted-foreground">{{ data.companyContact }}</div>
    </div>
  </div>
</template>
