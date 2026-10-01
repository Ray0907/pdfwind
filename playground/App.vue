<script setup>
import { reactive, computed, ref } from "vue";
import PdfPreview from "../src/components/PdfPreview/PdfPreview.vue";
import { render } from "./render.js";
import { DemoDoc, DemoHeader, DemoFooter } from "./DemoDoc.js";
import { demos } from "./demos.js";
import { themes, themeNames } from "../src/themes/index.js";

const param = new URLSearchParams(location.search);
const state = reactive({ demo: param.get("demo") ?? "invoice", title: "Invoice 1042", rows: 8, lang: param.get("lang") ?? "zh", theme: themeNames.includes(param.get("theme")) ? param.get("theme") : "default" });
const log = reactive([]); // one entry per finished render
const errors = reactive([]);
const delay = ref(0); // test seam, see e2e-hook.js
const last = () => log.at(-1);
const visible = Object.fromEntries(Object.entries(demos).filter(([, d]) => !d.hidden)); // tall-* / remote demos are E2E fixtures

const groups = ["Components", "Blocks"].map((name) => ({ name, items: Object.entries(visible).filter(([, d]) => (d.group ?? "Components") === name) }));
// "invoice" is the phase 1 sample document; every other entry is a component demo from demos.js
const current = computed(() => state.demo === "invoice"
  ? { component: DemoDoc, props: state, options: { header: DemoHeader, footer: DemoFooter, theme: state.theme } }
  : { component: demos[state.demo].component, props: {}, options: { margin: 40, ...demos[state.demo].options, theme: state.theme } });

const onRendered = (r) => log.push({ id: r.id, ms: r.ms, url: r.url, bytes: r.pdf.length, demo: state.demo, at: performance.now() });
defineExpose({ state, log, errors, delay });
</script>

<template>
  <div class="shell">
    <nav aria-label="Components">
      <h1>pdfwind</h1>
      <fieldset class="themes">
        <legend>Theme</legend>
        <label v-for="t in themeNames" :key="t" :title="themes[t].description"><input type="radio" name="theme" :value="t" v-model="state.theme" />{{ t }}</label>
      </fieldset>
      <a class="builder-link" href="?view=builder">Open the Theme Builder</a>
      <button :class="{ on: state.demo === 'invoice' }" @click="state.demo = 'invoice'">Sample invoice</button>
      <template v-for="grp in groups" :key="grp.name">
        <h2>{{ grp.name }}</h2>
        <button v-for="[key, d] in grp.items" :key="key" :class="{ on: state.demo === key }" @click="state.demo = key">{{ d.title }}</button>
      </template>
    </nav>
    <form v-if="state.demo === 'invoice'" class="controls" @submit.prevent>
      <label>Title <input v-model="state.title" /></label>
      <label>Rows: {{ state.rows }} <input type="range" min="1" max="120" v-model.number="state.rows" /></label>
      <label>Language <select v-model="state.lang"><option value="zh">中文</option><option value="en">English</option></select></label>
    </form>
    <p v-else class="controls">Every variant and size of <b>{{ demos[state.demo].title }}</b>. Edit <code>playground/demos.js</code> to change it.</p>
    <small class="stat">{{ last() ? `${last().ms} ms, ${last().bytes} bytes` : "rendering first PDF…" }}</small>
    <PdfPreview class="preview" :component="current.component" :props="current.props" :options="current.options" :render="render" @rendered="onRendered" @error="(e) => errors.push(e.message)" />
  </div>
</template>

<style>
.shell { display: grid; grid-template-columns: 220px 1fr; grid-template-rows: auto 1fr; height: 100%; }
.shell nav { grid-row: 1 / 3; display: flex; flex-direction: column; gap: 2px; padding: 12px; border-right: 1px solid #e4e4e7; overflow-y: auto; }
.shell nav h1 { font-size: 15px; margin: 0 0 8px; }
.shell nav h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #71717a; margin: 12px 0 4px; }
.themes { border: 1px solid #e4e4e7; border-radius: 6px; margin: 0 0 8px; padding: 4px 8px 6px; display: grid; grid-template-columns: 1fr 1fr; gap: 2px 8px; }
.builder-link { display: block; padding: 8px; margin: 0 0 8px; border: 1px solid #a1a1aa; border-radius: 6px; color: #5b21b6; text-align: center; text-decoration: none; font-weight: 600; }
.builder-link:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }
.themes legend { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #71717a; padding: 0 4px; }
.themes label { display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 2px 0; }
.themes input:focus-visible, .shell nav button:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }
.shell nav button { text-align: left; font: inherit; padding: 6px 8px; border: 0; border-radius: 6px; background: none; cursor: pointer; transition: background-color 120ms ease-out; }
.shell nav button:hover { background: #f4f4f5; }
.shell nav button.on { background: #e4e4e7; font-weight: 600; }
.controls { display: flex; gap: 16px; align-items: center; margin: 0; padding: 10px 16px; border-bottom: 1px solid #e4e4e7; }
.controls input[type="text"], .controls input:not([type]) { width: 160px; }
.stat { position: absolute; right: 16px; top: 12px; color: #71717a; }
.preview { grid-column: 2; min-height: 0; }
@media (prefers-reduced-motion: reduce) { .shell nav button { transition: none; } }
</style>
