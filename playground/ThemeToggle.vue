<script setup>
import { ref } from "vue";
import { readScheme, saveScheme, SCHEMES } from "./chrome.js";

// three-state page color scheme: follows the system until you choose; the choice is remembered. Only the playground chrome changes, never the PDF.
const scheme = ref(readScheme());
const labels = { system: "System", light: "Light", dark: "Dark" };
const set = (s) => { scheme.value = s; saveScheme(s); };
</script>

<template>
  <fieldset class="scheme">
    <legend>Page colors</legend>
    <label v-for="s in SCHEMES" :key="s"><input type="radio" name="scheme" :value="s" :checked="scheme === s" @change="set(s)" /><span>{{ labels[s] }}</span></label>
  </fieldset>
</template>

<style>
.scheme { border: 0; margin: 0; padding: 0; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.scheme legend { float: left; padding: 0; margin-right: 6px; font-size: 12px; color: var(--fg2); line-height: 40px; }
.scheme label { position: relative; display: inline-flex; }
.scheme input { position: absolute; opacity: 0; inset: 0; margin: 0; cursor: pointer; }
.scheme span { min-height: 40px; min-width: 40px; padding: 0 12px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--line2); border-radius: 8px; background: var(--btn); color: var(--fg); cursor: pointer; transition-property: background-color, border-color; transition-duration: 150ms; transition-timing-function: var(--ease); }
.scheme input:checked + span { background: var(--accent); border-color: var(--accent); color: var(--accent-fg); font-weight: 600; }
.scheme input:focus-visible + span { outline: 2px solid var(--ring); outline-offset: 2px; }
@media (hover: hover) { .scheme input:not(:checked) + span:hover { background: var(--btn-hover); } }
@media (prefers-reduced-motion: reduce) { .scheme span { transition: none; } }
</style>
