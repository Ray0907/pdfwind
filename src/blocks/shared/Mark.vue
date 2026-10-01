<script setup>
import PdfImage from "../../components/PdfImage/PdfImage.vue";
// logo slot content: the given image, or a monogram square from the company name
defineProps({ logo: String, name: { type: String, default: "" } });
</script>

<template>
  <PdfImage v-if="logo" :src="logo" fit="contain" class="size-full" />
  <div v-else class="flex size-full items-center justify-center rounded-md bg-primary font-bold text-primary-foreground">{{ name.trim().charAt(0).toUpperCase() }}</div>
</template>
