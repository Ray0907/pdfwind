// Phase 1 headed E2E: real Chromium PDF viewer (headless has none). Opens a visible window. Writes out/report-headed.md.
import { writeFileSync, mkdirSync } from "node:fs";
import { createServer } from "vite";
import { chromium } from "playwright-core";

mkdirSync("out", { recursive: true });
const checks = [];
const add = (name, pass, detail = "", info = false) => checks.push({ name, pass: !!pass, detail, info });
const guard = async (name, fn) => { try { await fn(); } catch (e) { add(name, false, `threw: ${String(e?.message ?? e).slice(0, 200)}`); } };

const server = await createServer({ configFile: "vite.config.js", server: { port: 0, host: "127.0.0.1" }, logLevel: "error" });
await server.listen();
const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
const browser = await chromium.launch({ headless: false });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  const probe = await browser.newPage(); // decodes screenshots via canvas
  const clip = { x: 260, y: 0, width: 840, height: 800 }; // the preview pane
  const shot = () => page.screenshot({ clip });
  // fraction of non-white pixels (blank iframe = all white; the viewer paints a dark toolbar + grey canvas)
  const inked = (png) => probe.evaluate(async (b64) => {
    const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
    const c = Object.assign(document.createElement("canvas"), { width: img.width, height: img.height }), x = c.getContext("2d");
    x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let n = 0;
    for (let i = 0; i < d.length; i += 4) n += d[i] < 245 || d[i + 1] < 245 || d[i + 2] < 245;
    return n / (d.length / 4);
  }, png.toString("base64"));
  const diff = (a, b) => probe.evaluate(async ([a, b]) => {
    const load = async (s) => { const i = new Image(); i.src = "data:image/png;base64," + s; await i.decode(); const c = Object.assign(document.createElement("canvas"), { width: i.width, height: i.height }), x = c.getContext("2d"); x.drawImage(i, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
    const [p, q] = [await load(a), await load(b)]; let n = 0;
    for (let i = 0; i < p.length; i += 4) n += Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]) > 40;
    return n / (p.length / 4);
  }, [a.toString("base64"), b.toString("base64")]);
  const count = () => page.evaluate(() => window.__pdfwind.renders.length);
  const settle = (n) => page.waitForFunction((n) => window.__pdfwind.renders.length >= n, n, { timeout: 30000 });

  await page.goto(url);
  await page.waitForFunction(() => window.__pdfwind?.renders.length >= 1, null, { timeout: 60000 });
  await page.waitForTimeout(1500); // let the viewer paint

  await guard("viewer", async () => {
    const f = await inked(await shot());
    const frames = await page.evaluate(() => [...document.querySelectorAll("iframe")].map((i) => i.className));
    add("Real PDF viewer paints the preview (non-blank pane)", f > 0.2, `${(f * 100).toFixed(0)}% of pane is non-white; iframe classes: ${frames.join(" | ")}`);
  });

  await guard("swap latency", async () => {
    const ms = [];
    for (let i = 1; i <= 5; i++) {
      ms.push(await page.evaluate(async (i) => {
        const w = window.__pdfwind, n = w.renders.length, t = performance.now();
        w.set({ title: `SWAP-${i}` });
        while (w.renders.length === n) await new Promise((r) => setTimeout(r, 2));
        return Math.round(performance.now() - t);
      }, i));
    }
    const med = [...ms].sort((a, b) => a - b)[2];
    add("iframe `load` fires in the real viewer; prop change -> swapped in <= 300ms (median of 5)", med <= 300 && Math.max(...ms) < 1900, `median ${med}ms, samples ${ms.join(", ")} (the no-load fallback would show ~2100ms)`);
  });

  // sample screenshots continuously from set() until well after the swap
  const sampleSwap = async (trigger) => {
    const n = await count(), fr = [];
    let done = false;
    const sampler = (async () => { while (!done) fr.push(await inked(await shot())); })();
    await trigger();
    await settle(n + 1);
    await page.waitForTimeout(700);
    done = true; await sampler;
    return fr;
  };

  // a frame is a flash if the pane is blank white (<20% inked) or the empty dark viewer with no page drawn (>90% inked)
  const flashes = (fr) => fr.filter((f) => f < 0.2 || f > 0.9).length;
  for (const rows of [8, 120]) {
    await guard(`no flash ${rows}`, async () => {
      await page.evaluate((r) => window.__pdfwind.set({ rows: r, title: `BASE-${r}` }), rows);
      await settle((await count()) + 1);
      await page.waitForTimeout(2500);
      await page.evaluate(() => window.__pdfwind.setDelay(500)); // render in flight: samples cover pre-swap, swap, post-swap
      const fr = await sampleSwap(() => page.evaluate((r) => window.__pdfwind.set({ title: `NOFLASH-${r}` }), rows));
      await page.evaluate(() => window.__pdfwind.setDelay(0));
      add(`No blank / empty-viewer frame through re-render + swap (${rows}-row doc)`, flashes(fr) === 0, `${fr.length} screenshots (~50-100ms apart), flash frames: ${flashes(fr)}. Brief flashes shorter than the sampling interval cannot be excluded`);
    });
  }

  await guard("control flash", async () => {
    // control: the naive approach (reassign the visible iframe's src); shows whether the sampler can see a flash at all
    await page.evaluate(() => window.__pdfwind.set({ rows: 8, title: "CTRL" }));
    await settle((await count()) + 1);
    await page.waitForTimeout(2500);
    const fr = await sampleSwap(() => page.evaluate(async () => {
      const f = document.querySelector("iframe:not(.back)"), bytes = await (await fetch(f.getAttribute("src"))).arrayBuffer();
      f.setAttribute("src", URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })));
      window.__pdfwind.renders.push({ id: -1, ms: 0, url: "", bytes: 0 }); // release settle()
    }));
    add("Control: naive single-iframe src swap, same sampler", true, `${fr.length} screenshots, flash frames: ${flashes(fr)} -> ${flashes(fr) ? "naive swap flashes, so the sampler can see a flash and the results above are meaningful" : "naive swap showed no flash either: sampler may be too coarse, treat the no-flash results as weak evidence"}`, true);
  });

  await guard("scroll", async () => {
    await page.evaluate(() => window.__pdfwind.set({ rows: 120, title: "SCROLL-0" }));
    await settle((await count()) + 1);
    await page.waitForTimeout(1500);
    const top = await shot();
    await page.mouse.move(700, 450);
    await page.mouse.wheel(0, 1600);
    await page.waitForTimeout(800);
    const scrolled = await shot();
    const n = await count();
    await page.evaluate(() => window.__pdfwind.set({ title: "SCROLL-1" }));
    await settle(n + 1);
    await page.waitForTimeout(1500);
    const after = await shot();
    writeFileSync("out/headed-scroll-before.png", scrolled); writeFileSync("out/headed-scroll-after.png", after);
    const moved = await diff(top, scrolled), keep = await diff(scrolled, after), reset = await diff(top, after);
    add("Scroll position across a re-render", true, `top->scrolled differs ${(moved * 100).toFixed(0)}%; scrolled->after ${(keep * 100).toFixed(0)}%; top->after ${(reset * 100).toFixed(0)}% (compare relative sizes; title text differs). ${keep < reset ? "PRESERVED" : "NOT preserved: viewer resets to page 1 after the swap"}`, true);
  });
} catch (e) {
  add("Headed run", false, `threw: ${String(e?.stack ?? e).slice(0, 300)}`);
} finally {
  await browser.close();
  await server.close();
}

const md = ["| # | check | result | detail |", "|---|---|---|---|", ...checks.map((c, i) => `| ${i + 1} | ${c.name} | ${c.info ? "INFO" : c.pass ? "PASS" : "FAIL"} | ${c.detail.replace(/\|/g, "\\|")} |`)].join("\n");
writeFileSync("out/report-headed.md", `# Phase 1 headed E2E\n\n${md}\n`);
console.log(md);
process.exit(checks.every((c) => c.pass) ? 0 : 1);
