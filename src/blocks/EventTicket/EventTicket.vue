<script>
import { eventTicketPage } from "../event.js";
/** Recommended render options: a 7in x 3.5in single page (672 x 336 CSS px), no margin. */
export const renderOptions = { ...eventTicketPage };
</script>

<script setup>
import { computed } from "vue";
import { cn, rest } from "../../lib/ui.js";
import QRCode from "../../components/QRCode/QRCode.vue";
import PdfImage from "../../components/PdfImage/PdfImage.vue";
import Mark from "../shared/Mark.vue";
import { eventTicketSample } from "../event.js";

defineOptions({ inheritAttrs: false });
// `data`: pdfcn's EventTicketData. The QR encodes ticketNumber unless `qrCodeUrl` (an image) is given.
const props = defineProps({ data: { type: Object, default: () => eventTicketSample } });
const accent = computed(() => props.data.accentColor ?? "var(--primary)");
// readable ink on the accent color: dark on light accents, white on dark ones (hex accents only)
const onAccent = computed(() => { const m = /^#?([0-9a-f]{6})$/i.exec(props.data.accentColor ?? ""); if (!m) return "#ffffff"; const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.55 ? "#18181b" : "#ffffff"; });
const handle = (url) => { const clean = url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, ""), parts = clean.split("/").filter(Boolean), h = parts.at(-1); return parts.length > 1 && h ? (h.startsWith("@") ? h : `@${h}`) : clean; };
const label = "mb-[3pt] text-[7pt] font-bold uppercase tracking-[0.5pt] leading-[1.2] text-muted-foreground";
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('relative flex h-[252pt] w-[504pt] flex-row overflow-hidden bg-background', $attrs.class)">
    <div class="w-[8pt]" :style="{ backgroundColor: accent }" />
    <div class="flex flex-1 flex-col justify-between pb-4 pl-5 pr-[18pt] pt-[18pt]">
      <div>
        <div class="mb-3.5 flex flex-row items-center gap-2">
          <div class="size-[14pt] text-[8pt]"><Mark :logo="data.logoUrl" :name="data.organizer ?? data.eventName" /></div>
          <div class="text-[8pt] font-bold uppercase tracking-[0.5pt] text-muted-foreground">{{ data.organizer ?? "Event ticket" }}</div>
          <div class="ml-auto rounded-full px-2 py-[3pt] text-[7pt] font-bold uppercase tracking-[0.5pt]" :style="{ backgroundColor: accent, color: onAccent }">{{ data.ticketType }}</div>
        </div>
        <div class="mb-2 text-[26pt] font-bold leading-[1.08] tracking-[-0.6pt]">{{ data.eventName }}</div>
        <div class="text-[10pt] leading-[1.4] text-muted-foreground">{{ data.venue }}</div>
        <div class="text-[10pt] leading-[1.4] text-muted-foreground">{{ data.address }}</div>
      </div>
      <div>
        <div class="flex flex-row">
          <div class="pr-3"><div :class="label">Date</div><div class="text-[12pt] font-bold">{{ data.eventDate }}</div></div>
          <div class="pr-3"><div :class="label">Time</div><div class="text-[12pt] font-bold">{{ data.eventTime }}</div></div>
          <div v-if="data.doorsOpen" class="pr-3"><div :class="label">Doors</div><div class="text-[12pt] font-bold">{{ data.doorsOpen }}</div></div>
          <div v-if="data.seat" class="pr-3"><div :class="label">Seat</div><div class="text-[12pt] font-bold">{{ data.seat.section }}–{{ data.seat.row }}–{{ data.seat.number }}</div></div>
        </div>
        <div v-if="data.terms || data.socialLinks?.length" class="mt-2.5 flex flex-row items-center gap-3">
          <div v-if="data.terms" class="flex-1 pr-2 text-[6.5pt] leading-[1.4] text-muted-foreground">{{ data.terms }}</div>
          <div v-if="data.socialLinks?.length" class="flex flex-row items-center gap-2">
            <div v-for="l in data.socialLinks" :key="l.platform" class="flex flex-row items-center gap-1"><span class="text-[6.5pt] font-bold uppercase tracking-[0.4pt] text-muted-foreground">{{ l.platform }}</span><span class="text-[6.5pt] text-muted-foreground">{{ handle(l.url) }}</span></div>
          </div>
        </div>
      </div>
    </div>
    <div class="flex w-[120pt] flex-col items-center justify-between px-3 pb-3.5 pt-4" :style="{ backgroundColor: accent, color: onAccent }">
      <div class="text-[7pt] font-bold uppercase tracking-[0.5pt]">Admit one</div>
      <div class="rounded-md bg-white p-[5pt]">
        <PdfImage v-if="data.qrCodeUrl" :src="data.qrCodeUrl" fit="contain" :width="68" :height="68" />
        <QRCode v-else :value="data.ticketNumber" :size="68" color="#000000" background-color="#ffffff" />
      </div>
      <div class="text-[7pt] font-bold uppercase tracking-[0.5pt]">{{ data.ticketNumber }}</div>
    </div>
    <!-- perforation: a dashed line (Takumi draws dashed borders only on all four sides) and two notches -->
    <div class="absolute bottom-0 top-0 left-[384pt] w-[2pt] text-background"><svg width="3" height="336"><line x1="1.5" y1="0" x2="1.5" y2="336" stroke="currentColor" stroke-width="2" stroke-dasharray="5 4" /></svg></div>
    <div class="absolute -top-2 left-[376pt] size-4 rounded-full bg-background" />
    <div class="absolute -bottom-2 left-[376pt] size-4 rounded-full bg-background" />
  </div>
</template>
