// Dev-only (main.js imports it under import.meta.env.DEV): lets scripts/e2e-*.mjs drive and observe the playground.
import { seam } from "./render.js";

export const install = (vm) => {
  seam.before = async () => vm.delay && new Promise((r) => setTimeout(r, vm.delay));
  window.__pdfwind = {
    set: (patch) => Object.assign(vm.state, patch),
    setDelay: (ms) => (vm.delay = ms),
    renders: vm.log,
    errors: vm.errors,
    iframeSrcs: () => [...document.querySelectorAll("iframe")].map((f) => f.getAttribute("src")),
    frontSrc: () => { const f = document.querySelector("iframe:not(.back)"); return f?.getAttribute("src") ?? null; },
    async pdfBytes(i = vm.log.length - 1) { return Array.from(new Uint8Array(await (await fetch(vm.log[i].url)).arrayBuffer())); },
  };
};
