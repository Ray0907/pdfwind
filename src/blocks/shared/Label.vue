<script setup>
import Text from "../../components/Text/Text.vue";
// the small uppercase caption above a block of details ("FROM", "BILL TO", ...)
defineOptions({ inheritAttrs: false });
defineProps({ color: { type: String, default: "muted-foreground" } });
</script>

<template>
  <Text v-bind="$attrs" variant="xs" weight="bold" transform="uppercase" no-margin :color="color" class="mb-1.5 text-[9pt] tracking-[0.6pt]"><slot /></Text>
</template>
