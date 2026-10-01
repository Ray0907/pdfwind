<script>
import MeetingMinutesFooter from "./MeetingMinutesFooter.vue";
import { docPage } from "../doc.js";
/** Recommended render options: A4, 56pt margins, footer band (prepared by, "Page n of N", distribution list). */
export const renderOptions = { ...docPage, footer: MeetingMinutesFooter };
</script>

<script setup>
import { cn, rest } from "../../lib/ui.js";
import PageBreak from "../../components/PageBreak/PageBreak.vue";
import Section from "../../components/Section/Section.vue";
import Text from "../../components/Text/Text.vue";
import List from "../../components/List/List.vue";
import Badge from "../../components/Badge/Badge.vue";
import DataTable from "../../components/DataTable/DataTable.vue";
import Label from "../shared/Label.vue";
import { blockVars } from "../invoice.js";
import { meetingMinutesSample } from "../doc.js";

defineOptions({ inheritAttrs: false });
// `data`: pdfcn's MeetingMinutesProps. Page 1: header, attendees, agenda, discussion. Page 2: decisions, action items, next meeting.
const props = defineProps({ data: { type: Object, default: () => meetingMinutesSample } });
const who = (a) => `${a.name}${a.role ? ` — ${a.role}` : ""}`;
const columns = () => [{ heading: "Attendees", names: props.data.attendees.map(who) }, ...(props.data.absent?.length ? [{ heading: "Absent", names: props.data.absent.map(who) }] : []), ...(props.data.guests?.length ? [{ heading: "Guests", names: props.data.guests }] : [])];
const tone = { Complete: "success", "In Progress": "info", "Not Started": "default" };
const cols = [{ key: "task", header: "Task" }, { key: "owner", header: "Owner", align: "center" }, { key: "dueDate", header: "Due Date", align: "center" }, { key: "status", header: "Status", align: "center" }];
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('flex flex-col', $attrs.class)" :style="[$attrs.style, blockVars]">
    <div class="flex flex-row items-start justify-between border-b-[2pt] border-border pb-4">
      <div class="flex-1"><div class="text-h3 font-bold leading-heading">{{ data.meetingTitle }}</div><div class="mt-1 leading-body text-muted-foreground">{{ data.location }} · Organized by {{ data.organizer }}</div></div>
      <div class="flex flex-col items-end"><div class="font-medium">{{ data.date }}</div><div class="mt-1 text-xs text-muted-foreground">{{ data.time }}</div></div>
    </div>
    <Section spacing="sm" class="flex-row">
      <div v-for="c in columns()" :key="c.heading" class="flex-1 pr-[15pt]"><Label>{{ c.heading }}</Label><Text v-for="n in c.names" :key="n" variant="xs" no-margin>{{ n }}</Text></div>
    </Section>
    <Section spacing="sm"><Label>Agenda</Label><Text v-for="(a, i) in data.agenda" :key="a" variant="sm" no-margin class="mb-1">{{ i + 1 }}. {{ a }}</Text></Section>
    <Section spacing="sm">
      <Label>Discussion</Label>
      <div v-for="d in data.discussions" :key="d.topic" class="mb-2">
        <Text variant="sm" weight="semibold" no-margin>{{ d.topic }}</Text>
        <Text v-if="d.speaker" variant="xs" color="muted-foreground" no-margin>— {{ d.speaker }}</Text>
        <List variant="bullet" gap="xs" :items="d.notes.map((text) => ({ text }))" />
      </div>
    </Section>
    <PageBreak />
    <Section spacing="sm">
      <Label>Decisions</Label>
      <div v-for="d in data.decisions" :key="d.number" class="mb-2"><Text variant="sm" weight="semibold" no-margin>{{ d.number }}. {{ d.decision }}</Text><Text v-if="d.rationale" variant="xs" color="muted-foreground" no-margin>{{ d.rationale }}</Text></div>
    </Section>
    <Section spacing="sm">
      <Label>Action Items</Label>
      <DataTable variant="grid" stripe :columns="cols" :data="data.actionItems">
        <template #cell-status="{ value }"><Badge :variant="tone[value]" size="sm" :label="value" /></template>
      </DataTable>
    </Section>
    <Section v-if="data.nextMeeting" spacing="sm" variant="highlight" :accent-color="data.accentColor">
      <Label>Next Meeting</Label>
      <Text variant="sm" weight="medium" no-margin>{{ data.nextMeeting.date }} · {{ data.nextMeeting.time }}</Text>
      <List v-if="data.nextMeeting.agenda" variant="bullet" gap="xs" :items="data.nextMeeting.agenda.map((text) => ({ text }))" />
    </Section>
  </div>
</template>
