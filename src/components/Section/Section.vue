<script setup>
import { cn, rest, color } from "../../lib/ui.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  spacing: { type: String, default: "md" }, // none | sm | md | lg | xl  (vertical margin)
  padding: String, // none | sm | md | lg
  background: String, // theme token or any CSS color
  border: Boolean, // outline, default variant only
  variant: { type: String, default: "default" }, // default | callout | highlight | card
  accentColor: String, // callout / highlight bar color
  noWrap: Boolean, // keep on one page
});

const spacings = { none: "my-0", sm: "my-4", md: "my-section", lg: "my-8", xl: "my-12" };
const paddings = { none: "p-0", sm: "p-3", md: "p-4", lg: "p-6" };
const variants = {
  default: "",
  callout: "border-l-[4pt] border-primary pl-4 py-2",
  highlight: "bg-muted border-l-[4pt] border-primary p-4",
  card: "border-[2pt] border-border rounded-md p-4",
};
</script>

<template>
  <div
    v-bind="rest($attrs)"
    :class="cn('flex flex-col', spacings[spacing], variants[variant], paddings[padding], border && variant === 'default' && 'border-[2pt] border-border rounded-md', noWrap && 'break-inside-avoid', $attrs.class)"
    :style="[$attrs.style, background && { backgroundColor: color(background) }, accentColor && (variant === 'callout' || variant === 'highlight') && { borderLeftColor: color(accentColor) }]"
  >
    <slot />
  </div>
</template>
