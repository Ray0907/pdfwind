import { renderPdf } from "../src/render/browser.js";

// test seam: e2e-hook.js sets `before` to inject latency; unset in normal use
export const seam = { before: null };
export const render = async (...a) => { await seam.before?.(); return renderPdf(...a); };
