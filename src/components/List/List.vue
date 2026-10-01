<script setup>
import { cn, rest } from "../../lib/ui.js";

defineOptions({ inheritAttrs: false });
defineProps({
  items: { type: Array, required: true }, // [{ text, description?, checked?, children? }]
  variant: { type: String, default: "bullet" }, // bullet | numbered | checklist | icon | multi-level | descriptive
  gap: { type: String, default: "sm" }, // xs | sm | md
  noWrap: Boolean,
  level: { type: Number, default: 0 }, // internal: nesting depth
});

const gaps = { xs: "gap-1", sm: "gap-2", md: "gap-3" };
// numbered / checklist / icon markers sit in a one-line-high cell, so they line up with the first line of wrapped text
const cell = ["numbered", "checklist", "icon"];
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('flex w-full flex-col', gaps[gap], level ? 'ml-5 mt-1' : 'mb-component', noWrap && 'break-inside-avoid', $attrs.class)">
    <div v-for="(item, i) in items" :key="i">
      <div :class="cn('flex flex-row', variant === 'descriptive' ? 'items-stretch' : 'items-start')">
        <div v-if="variant === 'bullet' || variant === 'multi-level'" class="mt-[6.5pt] flex w-4 flex-row justify-center">
          <div v-if="level === 0" class="size-[5pt] rounded-full bg-primary" />
          <div v-else class="size-[4pt] rounded-full border-[1pt] border-muted-foreground" />
        </div>
        <div v-else-if="variant === 'descriptive'" class="mr-3 min-h-4 w-[3pt] rounded-sm bg-primary" />
        <div v-else-if="cell.includes(variant)" class="mr-2 flex h-[19pt] flex-row items-center">
          <div v-if="variant === 'numbered'" class="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold leading-none text-primary-foreground">{{ i + 1 }}</div>
          <div v-else-if="variant === 'checklist'" :class="cn('flex size-4 items-center justify-center rounded-[3pt] border-[1.5pt] border-border bg-background', (item.checked ?? true) && 'border-success bg-success')">
            <!-- tick drawn from two borders: no glyph needed -->
            <div v-if="item.checked ?? true" class="h-[7pt] w-[3.5pt] border-b-[1.5pt] border-r-[1.5pt] border-primary-foreground" style="transform: translateY(-1pt) rotate(45deg)" />
          </div>
          <div v-else class="flex size-5 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <!-- currentColor: the HTML wrapper carries the token color (Takumi does not resolve var() in SVG attributes) -->
            <svg width="11" height="11" viewBox="0 0 24 24"><polygon points="12,2 15,9 22,9.3 16.5,14 18.2,21.5 12,17.5 5.8,21.5 7.5,14 2,9.3 9,9" fill="currentColor" /></svg>
          </div>
        </div>

        <div :class="cn('flex-1', cell.includes(variant) && 'flex min-h-[19pt] flex-row items-center')">
          <template v-if="variant === 'descriptive'">
            <div class="font-semibold leading-body text-foreground">{{ item.text }}</div>
            <div v-if="item.description" class="text-xs leading-body text-muted-foreground">{{ item.description }}</div>
          </template>
          <div v-else-if="variant === 'multi-level'" :class="level === 0 ? 'font-semibold leading-body text-foreground' : 'text-[10.5pt] leading-body text-muted-foreground'">{{ item.text }}</div>
          <div v-else :class="cn('leading-body text-foreground', cell.includes(variant) && 'flex-1')">{{ item.text }}</div>
        </div>
      </div>
      <List v-if="item.children?.length && (variant === 'bullet' || variant === 'multi-level')" :items="item.children" :variant="variant" :gap="gap" :level="level + 1" />
    </div>
  </div>
</template>
