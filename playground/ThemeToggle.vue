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
    <div class="segs"><label v-for="s in SCHEMES" :key="s"><input type="radio" name="scheme" :value="s" :checked="scheme === s" @change="set(s)" /><span>{{ labels[s] }}</span></label></div>
  </fieldset>
</template>

<style>
.scheme { border: 0; margin: 0; padding: 0; display: grid; gap: 0.25rem; min-width: 0; }
.scheme legend { padding: 0; font-size: 0.75rem; color: var(--fg2); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.25rem; }
.scheme .segs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.25rem; }
.scheme label { position: relative; display: flex; min-width: 0; }
.scheme input { position: absolute; z-index: 1; opacity: 0; inset: 0; margin: 0; cursor: pointer; } /* above the segment: the span gets its own stacking context from the scale transition */
.scheme span { flex: 1; min-height: 2.5rem; min-width: 2.5rem; padding: 0 0.5rem; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--line2); border-radius: 0.5rem; background: var(--btn); color: var(--fg); cursor: pointer; transition-property: background-color, border-color, scale; transition-duration: 150ms; transition-timing-function: var(--ease); }
.scheme input:checked + span { background: var(--accent); border-color: var(--accent); color: var(--accent-fg); font-weight: 600; }
.scheme input:focus-visible + span { outline: 2px solid var(--ring); outline-offset: 2px; }
.scheme label:active span { scale: 0.96; }
@media (hover: hover) { .scheme input:not(:checked) + span:hover { background: var(--btn-hover); } }
@media (prefers-reduced-motion: reduce) { .scheme span { transition: none; } .scheme label:active span { scale: 1; } }
</style>
