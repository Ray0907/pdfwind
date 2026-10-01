<script setup>
// plain list rows as in pdfcn's lesson plan: muted marker ("•" or "1.") + 10pt text; empty -> an em dash
defineProps({ items: { type: Array, default: () => [] }, numbered: Boolean });
</script>

<template>
  <div v-if="items.length">
    <div v-for="(t, i) in items" :key="i" class="mb-[3pt] flex flex-row">
      <div class="w-3 text-xs leading-body text-muted-foreground">{{ numbered ? `${i + 1}.` : "•" }}</div>
      <div class="flex-1 text-xs leading-body">{{ t }}</div>
    </div>
  </div>
  <div v-else class="text-xs text-muted-foreground">—</div>
</template>
