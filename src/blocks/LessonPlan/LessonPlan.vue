<script>
import { LessonPlanFooter } from "../footers.js";
import { docPage } from "../doc.js";
/** Recommended render options: A4, 56pt margins, repeating footer band ("Subject · Grade · Title" + "Page n of N"). */
export const renderOptions = { ...docPage, footer: LessonPlanFooter };
</script>

<script setup>
import { computed } from "vue";
import { cn, rest } from "../../lib/ui.js";
import PageBreak from "../../components/PageBreak/PageBreak.vue";
import Section from "../../components/Section/Section.vue";
import Text from "../../components/Text/Text.vue";
import Table from "../../components/Table/Table.vue";
import TableHeader from "../../components/Table/TableHeader.vue";
import TableBody from "../../components/Table/TableBody.vue";
import TableFooter from "../../components/Table/TableFooter.vue";
import TableRow from "../../components/Table/TableRow.vue";
import TableCell from "../../components/Table/TableCell.vue";
import Label from "../shared/Label.vue";
import MiniList from "../shared/MiniList.vue";
import { blockVars } from "../invoice.js";
import { lessonPlanSample } from "../doc.js";

defineOptions({ inheritAttrs: false });
// `data`: pdfcn's LessonPlanProps. Two pages: overview + lesson sequence, then differentiation / assessment / homework / reflection lines.
const props = defineProps({ data: { type: Object, default: () => lessonPlanSample } });
const info = computed(() => [["Subject", props.data.subject], ["Grade Level", props.data.gradeLevel], ["Teacher", props.data.teacherName], ["Duration", props.data.duration]]);
// derived: the planned minutes of the sequence ("5 min", "1 hr" are not parsed: minutes only), shown in the table footer
const minutes = computed(() => props.data.sequence.reduce((s, x) => s + (parseInt(x.time, 10) || 0), 0));
const planned = computed(() => parseInt(props.data.duration, 10));
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('flex flex-col', $attrs.class)" :style="[$attrs.style, blockVars]">
    <div class="mb-4 flex flex-row items-start justify-between border-b-[2pt] border-border pb-4">
      <div class="flex-1"><div class="text-h3 font-bold leading-heading">{{ data.lessonTitle }}</div><div class="mt-1 leading-body text-muted-foreground">{{ data.topic ? `Lesson Plan · ${data.topic}` : "Lesson Plan" }}</div></div>
      <div class="text-right font-medium">{{ data.date }}</div>
    </div>
    <div class="mb-4 flex flex-row border-b-[1pt] border-border pb-3">
      <div v-for="[k, v] in info" :key="k" class="flex-1 pr-2.5"><Label class="mb-1">{{ k }}</Label><Text variant="xs" weight="medium" no-margin>{{ v }}</Text></div>
    </div>
    <Section v-if="data.essentialQuestion" variant="highlight" :accent-color="data.accentColor" spacing="none" padding="sm" class="mb-4">
      <Label class="mb-1">Essential Question</Label><Text variant="sm" weight="medium" no-margin>{{ data.essentialQuestion }}</Text>
    </Section>
    <div class="mb-4 flex flex-row">
      <div class="flex-[2] pr-5"><Label class="mb-1">Objectives</Label><Text variant="xs" color="muted-foreground" no-margin class="mb-[3pt]">Students will be able to (SWBAT):</Text><MiniList :items="data.objectives" numbered /></div>
      <div v-if="data.standards?.length" class="flex-1 pr-2.5"><Label class="mb-1">Standards</Label><MiniList :items="data.standards" /></div>
      <div class="flex-1 pr-2.5"><Label class="mb-1">Materials</Label><MiniList :items="data.materials" /></div>
    </div>
    <div>
      <Label class="mb-1">Lesson Sequence</Label>
      <Table variant="grid" zebra-stripe>
        <TableHeader><TableRow><TableCell :width="68">Time</TableCell><TableCell :width="96">Activity</TableCell><TableCell>Description</TableCell><TableCell :width="140">Notes</TableCell></TableRow></TableHeader>
        <TableBody><TableRow v-for="(s, i) in data.sequence" :key="i"><TableCell :width="68">{{ s.time }}</TableCell><TableCell :width="96">{{ s.activity }}</TableCell><TableCell>{{ s.description }}</TableCell><TableCell :width="140">{{ s.notes ?? "—" }}</TableCell></TableRow></TableBody>
        <TableFooter><TableRow><TableCell :width="68">{{ minutes }} min</TableCell><TableCell :width="96">Total</TableCell><TableCell>{{ minutes === planned ? `matches the ${data.duration} lesson` : `planned ${data.duration}` }}</TableCell><TableCell :width="140" /></TableRow></TableFooter>
      </Table>
    </div>
    <PageBreak />
    <div v-if="data.differentiation?.length" class="mb-4"><Label class="mb-1">Differentiation</Label><MiniList :items="data.differentiation" /></div>
    <div class="mb-4 flex flex-row">
      <div class="flex-[2] pr-5"><Label class="mb-1">Formative Assessment</Label><MiniList :items="data.assessment.formative" /></div>
      <div class="flex-[2] pr-5"><Label class="mb-1">Summative Assessment</Label><MiniList :items="data.assessment.summative" /></div>
    </div>
    <div v-if="data.homework" class="mb-4"><Label class="mb-1">Homework</Label><Text variant="xs" no-margin>{{ data.homework }}</Text></div>
    <div>
      <Label class="mb-1">Teacher Reflection</Label>
      <Text v-if="data.reflection" variant="xs" no-margin>{{ data.reflection }}</Text>
      <div v-for="n in 8" :key="n" class="h-6 border-b-[1pt] border-border" />
    </div>
  </div>
</template>
