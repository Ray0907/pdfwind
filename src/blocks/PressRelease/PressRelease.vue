<script>
import { PressReleaseFooter } from "../footers.js";
import { docPage } from "../doc.js";
/** Recommended render options: A4, 56pt margins, footer band (address left, social platforms right). */
export const renderOptions = { ...docPage, footer: PressReleaseFooter };
</script>

<script setup>
import { cn, rest } from "../../lib/ui.js";
import Section from "../../components/Section/Section.vue";
import Text from "../../components/Text/Text.vue";
import Label from "../shared/Label.vue";
import { blockVars } from "../invoice.js";
import { pressReleaseSample } from "../doc.js";

defineOptions({ inheritAttrs: false });
// `data`: pdfcn's PressReleaseProps (headline, subheadline, dateline, body[], quotes[], boilerplate, mediaContact, address, socialLinks).
defineProps({ data: { type: Object, default: () => pressReleaseSample } });
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('flex flex-col', $attrs.class)" :style="[$attrs.style, blockVars]">
    <div class="flex flex-row items-start justify-between border-b-[2pt] border-border pb-4">
      <div class="text-h3 font-bold leading-heading">{{ data.companyName }}</div>
      <div class="font-medium">{{ data.date }}</div>
    </div>
    <Section spacing="none" class="mt-0">
      <Text variant="xs" weight="bold" transform="uppercase" :color="data.accentColor ?? 'muted-foreground'" no-margin class="tracking-[0.6pt]">For Immediate Release</Text>
      <Text variant="2xl" weight="bold" no-margin>{{ data.headline }}</Text>
      <Text v-if="data.subheadline" variant="lg" color="muted-foreground" no-margin>{{ data.subheadline }}</Text>
    </Section>
    <Section spacing="none">
      <Text variant="sm" weight="semibold" transform="uppercase" no-margin>{{ data.dateline.city }}, {{ data.dateline.state }} — {{ data.date }}</Text>
      <Text v-for="(p, i) in data.body" :key="i" variant="sm">{{ p }}</Text>
    </Section>
    <Section v-for="q in data.quotes" :key="q.author" spacing="sm" variant="callout" :accent-color="data.accentColor">
      <Text variant="base" italic no-margin>“{{ q.text }}”</Text>
      <Text variant="xs" color="muted-foreground" no-margin>— {{ q.author }}, {{ q.title }}</Text>
    </Section>
    <Section spacing="sm"><Label>About {{ data.companyName }}</Label><Text variant="sm" no-margin>{{ data.boilerplate }}</Text></Section>
    <Section spacing="none">
      <Label>Media Contact</Label>
      <Text variant="xs" no-margin>{{ data.mediaContact.name }}</Text><Text variant="xs" no-margin>{{ data.mediaContact.email }}</Text><Text variant="xs" no-margin>{{ data.mediaContact.phone }}</Text><Text v-if="data.mediaContact.website" variant="xs" no-margin>{{ data.mediaContact.website }}</Text>
    </Section>
    <Text align="center" variant="sm" weight="medium" no-margin class="mt-4">###</Text>
  </div>
</template>
