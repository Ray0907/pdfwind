<script setup>
import Footer from "./Footer.vue";
// the report band: "Confidential — Internal Use" (data.footerText) + "Page n of N", inset to the 48pt page margin
defineProps({ data: { type: Object, default: () => ({}) } });
</script>

<template>
  <Footer :data="data" variant="three-column" :inset="48" :lift="33" :text="data.footerText ?? 'Confidential — Internal Use'" />
</template>
