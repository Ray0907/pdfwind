<script setup>
import { reactive, computed, ref, onMounted, onBeforeUnmount } from "vue";
import PdfPreview from "../src/components/PdfPreview/PdfPreview.vue";
import { render } from "./render.js";
import { DemoDoc, DemoHeader, DemoFooter } from "./DemoDoc.js";
import { demos } from "./demos.js";
import { themes, themeNames } from "../src/themes/index.js";
import ThemeToggle from "./ThemeToggle.vue";

const param = new URLSearchParams(location.search);
const state = reactive({ demo: param.get("demo") ?? "showcase", title: "Invoice 1042", rows: 8, lang: param.get("lang") ?? "zh", theme: themeNames.includes(param.get("theme")) ? param.get("theme") : "default" });
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
const title = computed(() => (state.demo === "invoice" ? "Sample invoice" : demos[state.demo].title));
// narrow screens: the sidebar becomes a disclosure above the content (closed until opened); wide screens keep it open and hide the summary
const mq = typeof matchMedia === "function" ? matchMedia("(min-width: 48rem)") : null;
const navOpen = ref(mq?.matches ?? true);
const onMq = (e) => { navOpen.value = e.matches; };
onMounted(() => mq?.addEventListener("change", onMq));
onBeforeUnmount(() => mq?.removeEventListener("change", onMq));
defineExpose({ state, log, errors, delay });
</script>

<template>
  <div class="shell">
    <a class="skip" href="#preview">Skip to preview</a>
    <header class="side">
      <p class="brand">pdfwind</p>
      <details class="navbox" :open="navOpen" @toggle="navOpen = $event.target.open">
        <summary>Documents, themes and settings</summary>
        <fieldset class="themes" aria-describedby="theme-desc">
          <legend>Theme</legend>
          <label v-for="t in themeNames" :key="t"><input type="radio" name="theme" :value="t" v-model="state.theme" />{{ t }}</label>
        </fieldset>
        <p id="theme-desc" class="hint">{{ themes[state.theme].description }}</p>
        <ThemeToggle class="nav-scheme" />
        <a class="builder-link" href="?view=builder">Open the Theme Builder</a>
        <nav aria-label="Components">
          <button type="button" :class="{ on: state.demo === 'invoice' }" :aria-current="state.demo === 'invoice' ? 'true' : undefined" @click="state.demo = 'invoice'">Sample invoice</button>
          <template v-for="grp in groups" :key="grp.name">
            <h2>{{ grp.name }}</h2>
            <button v-for="[key, d] in grp.items" :key="key" type="button" :class="{ on: state.demo === key }" :aria-current="state.demo === key ? 'true' : undefined" @click="state.demo = key">{{ d.title }}</button>
          </template>
        </nav>
      </details>
    </header>
    <main id="preview" class="content" tabindex="-1">
      <div class="bar">
        <h1>{{ title }}</h1>
        <form v-if="state.demo === 'invoice'" class="controls" @submit.prevent>
          <label>Title <input v-model="state.title" /></label>
          <label>Rows: {{ state.rows }} <input type="range" min="1" max="120" v-model.number="state.rows" /></label>
          <label>Language <select v-model="state.lang"><option value="zh">中文</option><option value="en">English</option></select></label>
        </form>
        <p v-else-if="state.demo === 'showcase'" class="lede">A realistic report built only from pdfwind components and theme tokens. Pick a theme, or open any component or block.</p>
        <p v-else class="lede">Every variant and size of this component. Edit <code>playground/demos.js</code> to change it.</p>
        <small class="stat">{{ last() ? `${last().ms} ms, ${last().bytes} bytes` : "rendering first PDF…" }}</small>
      </div>
      <PdfPreview class="preview" :component="current.component" :props="current.props" :options="current.options" :render="render" @rendered="onRendered" @error="(e) => errors.push(e.message)" />
    </main>
  </div>
</template>

<style>
.shell { display: grid; grid-template-columns: 15rem minmax(0, 1fr); height: 100%; }
.side { overflow-y: auto; border-right: 1px solid var(--line); background: var(--bg); color: var(--fg); padding: 0.75rem; min-width: 0; }
.brand { margin: 0 0 0.5rem; font-size: 1rem; font-weight: 650; }
.navbox > summary { display: none; }
.side fieldset { min-width: 0; }
.themes { border: 1px solid var(--line); border-radius: 0.5rem; margin: 0 0 0.25rem; padding: 0 0.5rem 0.25rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0 0.25rem; }
.themes legend { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg2); padding: 0 0.25rem; }
.themes label { display: flex; align-items: center; gap: 0.5rem; min-height: 2.5rem; padding: 0 0.25rem; border-radius: 0.5rem; cursor: pointer; }
.themes input { margin: 0; flex: none; }
@media (hover: hover) { .themes label:hover { background: var(--btn-hover); } }
.hint { margin: 0 0 0.75rem; font-size: 0.75rem; line-height: 1.4; color: var(--fg2); }
.nav-scheme { margin-bottom: 0.5rem; }
.builder-link, .side nav button { display: flex; align-items: center; min-height: 2.5rem; box-sizing: border-box; text-align: left; font: inherit; color: var(--fg); padding: 0 0.5rem; border-radius: 0.5rem; cursor: pointer; transition-property: background-color, scale; transition-duration: 150ms; transition-timing-function: var(--ease); }
.builder-link { justify-content: center; margin: 0 0 0.5rem; border: 1px solid var(--line2); color: var(--accent); text-decoration: none; font-weight: 600; }
.side nav { display: flex; flex-direction: column; gap: 0.125rem; }
.side nav button { width: 100%; border: 0; background: none; }
.side nav h2 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg2); margin: 0.75rem 0 0.25rem; }
.builder-link:active, .side nav button:active { scale: 0.96; }
@media (hover: hover) { .builder-link:hover, .side nav button:hover { background: var(--btn-hover); } }
.side nav button.on { background: var(--sel); font-weight: 600; }
.content { display: grid; grid-template-rows: auto minmax(0, 1fr); min-height: 0; min-width: 0; }
.content:focus { outline: none; }
.bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.25rem 1rem; padding: 0.625rem 1rem; border-bottom: 1px solid var(--line); min-width: 0; }
.bar h1 { margin: 0; font-size: 1.0625rem; font-weight: 650; }
.lede, .controls { margin: 0; min-width: 0; }
.controls { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; align-items: center; }
.controls label { display: inline-flex; align-items: center; gap: 0.5rem; min-height: 2.5rem; }
.controls input[type="text"], .controls input:not([type]) { width: 10rem; max-width: 100%; min-height: 2.5rem; }
.controls select, .controls input[type="range"] { min-height: 2.5rem; }
.stat { margin-left: auto; font-size: 0.8125rem; color: var(--fg2); }
.preview { min-height: 0; }
.skip { position: absolute; left: 0.5rem; top: -3rem; z-index: 10; padding: 0.625rem 0.875rem; border-radius: 0.5rem; background: var(--surface); border: 1px solid var(--line2); color: var(--fg); }
.skip:focus { top: 0.5rem; }
@media (max-width: 47.99rem) {
  .shell { display: block; height: auto; min-height: 100%; }
  .side { overflow: visible; border-right: 0; border-bottom: 1px solid var(--line); }
  .navbox > summary { display: flex; align-items: center; min-height: 2.5rem; padding: 0 0.5rem; border: 1px solid var(--line2); border-radius: 0.5rem; cursor: pointer; font-weight: 600; }
  .navbox[open] > summary { margin-bottom: 0.5rem; }
  .content { display: block; }
  .preview { height: 80dvh; min-height: 24rem; }
  .stat { margin-left: 0; }
}
@media (prefers-reduced-motion: reduce) { .builder-link, .side nav button { transition: none; } .builder-link:active, .side nav button:active { scale: 1; } }
</style>
