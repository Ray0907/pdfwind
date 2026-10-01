<script>
import MedicalIntakeFormFooter from "./MedicalIntakeFormFooter.vue";
import { medicalPage } from "../doc.js";
/** Recommended render options: A4, 48pt margins, footer band (form version, clinic address, phone, "Page n of N"). */
export const renderOptions = { ...medicalPage, footer: MedicalIntakeFormFooter };
</script>

<script setup>
import { computed } from "vue";
import { cn, rest, color } from "../../lib/ui.js";
import PageHeader from "../../components/PageHeader/PageHeader.vue";
import PageBreak from "../../components/PageBreak/PageBreak.vue";
import Section from "../../components/Section/Section.vue";
import Text from "../../components/Text/Text.vue";
import Form from "../../components/Form/Form.vue";
import List from "../../components/List/List.vue";
import Table from "../../components/Table/Table.vue";
import TableHeader from "../../components/Table/TableHeader.vue";
import TableBody from "../../components/Table/TableBody.vue";
import TableRow from "../../components/Table/TableRow.vue";
import TableCell from "../../components/Table/TableCell.vue";
import Signature from "../../components/Signature/Signature.vue";
import Mark from "../shared/Mark.vue";
import { blockVars } from "../invoice.js";
import { medicalIntakeFormSample } from "../doc.js";

defineOptions({ inheritAttrs: false });
// `data`: pdfcn's MedicalIntakeFormProps. A printable blank form; every section can be switched off (all default to true).
const props = defineProps({ data: { type: Object, default: () => medicalIntakeFormSample } });
const on = (k) => props.data[k] ?? true;
const rule = computed(() => color(props.data.accentColor ?? "primary"));
const f = (label, extra = {}) => ({ label, height: 14, ...extra });
const personal = [{ title: "Patient Information", layout: "two-column", fields: [f("Full Name"), f("Date of Birth", { hint: "DD / MM / YYYY" }), f("Gender"), f("Phone Number", { hint: "+1 (555) 000-0000" }), f("Email Address")] }, { title: "Address", layout: "two-column", fields: [f("Street Address", { width: "100%" }), f("City"), f("State / Province"), f("Postal Code")] }];
const emergency = [{ title: "Emergency Contact", layout: "two-column", fields: [f("Emergency Contact Name"), f("Relationship"), f("Phone Number")] }];
const insurance = [{ title: "Insurance", layout: "two-column", fields: [f("Insurance Provider"), f("Policy Number"), f("Group Number"), f("Subscriber Name")] }];
const conditions = ["Diabetes", "High Blood Pressure", "Heart Disease", "Asthma", "COPD", "Cancer", "Stroke", "Thyroid Disorder", "Kidney Disease", "Liver Disease", "Seizures / Epilepsy", "Other"];
const checklist = (labels) => labels.map((text) => ({ text, checked: false }));
const consent = [{ text: "I have read and understand the consent above.", checked: false }, { text: "I have received the Notice of Privacy Practices.", checked: false }];
const page2 = computed(() => on("allergies") || on("consent") || on("medications") || on("reasonForVisit") || on("medicalHistory"));
const label = "mb-1 border-b-[1pt] pb-0.5 text-[9pt] font-bold uppercase tracking-[0.5pt]";
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('flex flex-col', $attrs.class)" :style="[$attrs.style, blockVars]">
    <PageHeader variant="logo-left" :title="data.clinicName" subtitle="Patient Intake Form" :right-text="data.clinicPhone" :right-sub-text="data.clinicAddress" :margin-bottom="16">
      <template v-if="data.clinicLogo" #logo><Mark :logo="data.clinicLogo" :name="data.clinicName" /></template>
    </PageHeader>
    <Form v-if="on('personalInfo')" :groups="personal" class="mb-0" />
    <Form v-if="on('emergencyContact')" :groups="emergency" class="mb-0" />
    <Form v-if="on('insurance')" :groups="insurance" class="mb-0" />
    <template v-if="page2">
      <PageBreak />
      <div class="mb-2 flex flex-row items-end justify-between"><div class="text-[13pt] font-bold">{{ data.clinicName }} — Patient Intake Form (continued)</div><Text variant="xs" color="muted-foreground" no-margin>{{ data.clinicPhone }}</Text></div>
      <div v-if="on('medicalHistory')" class="mb-1">
        <div :class="label" :style="{ borderColor: rule }">Medical History</div>
        <div class="flex flex-row gap-5">
          <div class="flex-1"><List variant="checklist" gap="xs" :items="checklist(conditions.slice(0, 4))" class="mb-0" /></div>
          <div class="flex-1"><List variant="checklist" gap="xs" :items="checklist(conditions.slice(4, 8))" class="mb-0" /></div>
          <div class="flex-1"><List variant="checklist" gap="xs" :items="checklist(conditions.slice(8))" class="mb-0" /></div>
        </div>
      </div>
      <div v-if="on('medications')" class="mb-1">
        <div :class="label" :style="{ borderColor: rule }">Current Medications</div>
        <Table variant="grid" class="mb-0"><TableHeader><TableRow><TableCell>Medication</TableCell><TableCell>Dosage</TableCell><TableCell>Frequency</TableCell><TableCell>Prescribing Doctor</TableCell></TableRow></TableHeader>
          <TableBody><TableRow v-for="n in 4" :key="n"><TableCell v-for="m in 4" :key="m"><div class="min-h-[14pt]" /></TableCell></TableRow></TableBody></Table>
      </div>
      <div v-if="on('allergies')" class="mb-1">
        <div :class="label" :style="{ borderColor: rule }">Allergies</div>
        <Table variant="grid" class="mb-0"><TableHeader><TableRow><TableCell>Allergen</TableCell><TableCell>Reaction</TableCell><TableCell>Severity</TableCell></TableRow></TableHeader>
          <TableBody><TableRow v-for="n in 3" :key="n"><TableCell v-for="m in 3" :key="m"><div class="min-h-[14pt]" /></TableCell></TableRow></TableBody></Table>
      </div>
      <div v-if="on('reasonForVisit')" class="mb-1"><div :class="label" :style="{ borderColor: rule }">Reason for Visit</div><div class="min-h-10 rounded-sm border-[1pt] border-border" /></div>
      <div v-if="on('consent')" class="mb-1 break-inside-avoid">
        <div :class="label" :style="{ borderColor: rule }">Consent &amp; Authorization</div>
        <Section :accent-color="data.accentColor" padding="sm" spacing="none" variant="highlight">
          <Text color="muted-foreground" no-margin class="mb-1.5 text-xs leading-[1.4]">I authorize {{ data.clinicName }} to provide treatment and to release the information required to process insurance claims for this visit, and I acknowledge that I have received the Notice of Privacy Practices (HIPAA) explaining how my health information may be used.</Text>
          <List gap="xs" :items="consent" variant="checklist" class="mb-0" />
        </Section>
        <Signature variant="double" class="mb-0 mt-2" :signers="[{ label: 'Patient / Guardian Signature' }, { label: 'Date' }]" />
      </div>
    </template>
  </div>
</template>
