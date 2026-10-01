<script>
import EventAgendaFooter from "./EventAgendaFooter.vue";
import { eventAgendaPage } from "../event.js";
/** Recommended render options: A4, 32pt margins, repeating footer band (Wi-Fi, organizers desk, "Page n of N"). */
export const renderOptions = { ...eventAgendaPage, footer: EventAgendaFooter };
</script>

<script setup>
import { computed } from "vue";
import { cn, rest, color, onColor, tint } from "../../lib/ui.js";
import PageBreak from "../../components/PageBreak/PageBreak.vue";
import { blockVars } from "../invoice.js";
import { eventAgendaSample } from "../event.js";

defineOptions({ inheritAttrs: false });
// `data`: pdfcn's EventAgendaProps (eventName, date, endDate, venue, days[{ label, date, sessions }], tracks, accentColor, wifiInfo, emergencyContact).
// One page per day (a long day continues on the next page). Sessions with the same start time sit side by side.
const props = defineProps({ data: { type: Object, default: () => eventAgendaSample } });
const accent = computed(() => color(props.data.accentColor ?? "primary")); // a theme token name or any CSS color
const onAccent = computed(() => onColor(props.data.accentColor ?? "primary"));
const trackColor = computed(() => Object.fromEntries((props.data.tracks ?? []).map((t) => [t.name.toLowerCase(), color(t.color)])));
const slots = (sessions) => { const out = [], by = new Map(); for (const s of sessions) { if (!by.has(s.time)) { const g = { time: s.time, sessions: [] }; by.set(s.time, g); out.push(g); } by.get(s.time).sessions.push(s); } return out; };
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('flex flex-col', $attrs.class)" :style="[$attrs.style, blockVars]">
    <template v-for="(day, di) in data.days" :key="day.label">
      <PageBreak v-if="di > 0" />
      <!-- header -->
      <div class="flex flex-row justify-between border-b-[1.5pt] border-border pb-2.5">
        <div class="flex-1 pr-4">
          <div class="mb-0.5 text-[8.5pt] font-bold uppercase tracking-[0.6pt] leading-[1.65]" :style="{ color: accent }">Event Agenda</div>
          <div class="mb-1 text-[20pt] font-bold leading-[1.2]">{{ data.eventName }}</div>
          <div class="text-[8.5pt] text-muted-foreground">{{ data.date }}{{ data.endDate ? ` – ${data.endDate}` : "" }} • {{ data.venue }}</div>
        </div>
        <div class="flex flex-col items-end justify-center">
          <div class="rounded-sm px-2.5 py-1 text-[10pt] font-bold uppercase tracking-[0.8pt]" :style="{ backgroundColor: accent, color: onAccent }">Agenda</div>
        </div>
      </div>
      <!-- day banner -->
      <div class="mb-2.5 mt-2 flex flex-row items-center justify-between rounded-md border-[1pt] border-border bg-muted px-3 py-1.5">
        <div class="flex flex-row items-center gap-1.5"><span class="text-[11pt] font-bold">{{ day.label }}</span><span class="text-[9pt] text-muted-foreground">— {{ day.date }}</span></div>
        <span class="text-[8.5pt] font-semibold text-muted-foreground">Day {{ di + 1 }} of {{ data.days.length }}</span>
      </div>
      <!-- track legend -->
      <div v-if="data.tracks?.length" class="mb-2 flex flex-row flex-wrap items-center gap-1.5">
        <span class="mr-1 text-[7.5pt] font-bold uppercase tracking-[0.5pt] text-muted-foreground">Tracks:</span>
        <div v-for="t in data.tracks" :key="t.name" class="flex flex-row items-center rounded-sm border-[1pt] border-border bg-muted px-1.5 py-0.5">
          <div class="mr-1 size-[7pt] rounded-full" :style="{ backgroundColor: color(t.color) }" /><span class="text-[7.5pt] font-semibold">{{ t.name }}</span>
        </div>
      </div>
      <!-- time grid -->
      <div v-for="slot in slots(day.sessions)" :key="slot.time" class="mb-2 flex flex-row break-inside-avoid">
        <div class="flex w-[78pt] flex-col items-start pt-0.5">
          <div class="text-[9pt] font-bold leading-[1.65]">{{ slot.time }}</div>
          <div v-if="slot.sessions[0].endTime" class="text-[7.5pt] leading-[1.65] text-muted-foreground">to {{ slot.sessions[0].endTime }}</div>
        </div>
        <div v-if="slot.sessions.length === 1 && slot.sessions[0].isBreak" class="flex-1 rounded-md border-[1pt] border-dashed border-border bg-muted px-2.5 py-[7pt]">
          <div class="flex flex-row items-center justify-between"><span class="text-[9.5pt] font-bold">{{ slot.sessions[0].title }}</span><span class="rounded-sm border-[1pt] border-border bg-muted px-1.5 py-0.5 text-[7pt] font-bold uppercase tracking-[0.5pt] text-muted-foreground">Break</span></div>
          <div v-if="slot.sessions[0].description" class="mt-0.5 text-[7.5pt] text-muted-foreground">{{ slot.sessions[0].description }}</div>
        </div>
        <div v-else class="flex flex-1 flex-row gap-2">
          <div v-for="(s, si) in slot.sessions" :key="si" class="flex flex-1 flex-col rounded-md border-[1pt] border-border bg-background px-2.5 py-[7pt]" :style="trackColor[s.track?.toLowerCase()] && { borderLeftWidth: '3pt', borderLeftColor: trackColor[s.track.toLowerCase()] }">
            <div v-if="s.track || s.room" class="mb-[3pt] flex flex-row items-center gap-1">
              <span v-if="s.track" class="shrink-0 whitespace-nowrap rounded-sm px-1.5 py-px text-[7pt] font-bold" :style="{ color: trackColor[s.track.toLowerCase()] ?? 'var(--foreground)', backgroundColor: trackColor[s.track.toLowerCase()] ? tint(trackColor[s.track.toLowerCase()], 10) : 'var(--muted)' }">{{ s.track }}</span>
              <span v-if="s.room" class="shrink-0 whitespace-nowrap rounded-sm border-[1pt] border-border bg-muted px-[5pt] py-px text-[7pt] font-semibold text-muted-foreground">{{ s.room }}</span>
            </div>
            <div class="text-[9pt] font-bold leading-[1.25]">{{ s.title }}</div>
            <div v-if="s.speaker" class="mt-0.5 text-[7.8pt] font-semibold" :style="{ color: accent }">{{ s.speaker }}</div>
            <div v-if="s.description" class="mt-0.5 text-[7.2pt] leading-[1.2] text-muted-foreground">{{ s.description }}</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
