<script setup>
import { computed } from "vue";
import { cn, rest } from "../../lib/ui.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  format: { type: String, default: "Page {page} of {total}" }, // {page} and {total}
  align: { type: String, default: "center" }, // left | center | right
  size: { type: String, default: "sm" }, // xs | sm | md
  muted: { type: Boolean, default: true },
});

const aligns = { left: "text-left", center: "text-center", right: "text-right" };
const sizes = { xs: "text-xs", sm: "text-sm", md: "text-base" };
// Takumi fills `.pageNumber` / `.totalPages` nodes with the counters, in the page body as well as in header/footer bands.
// The parts are inline spans in one block (not flex items), or the spaces around the counters collapse.
const parts = computed(() => props.format.split(/(\{page\}|\{total\})/).filter(Boolean));
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('w-full', aligns[align], sizes[size], muted ? 'text-muted-foreground' : 'text-foreground', $attrs.class)">
    <template v-for="(p, i) in parts" :key="i">
      <span v-if="p === '{page}'" class="pageNumber" />
      <span v-else-if="p === '{total}'" class="totalPages" />
      <span v-else>{{ p }}</span>
    </template>
  </div>
</template>
