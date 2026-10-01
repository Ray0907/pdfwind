import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
export async function serve(directory, base = "/") {
  const root = resolve(directory);
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".wasm": "application/wasm", ".woff2": "font/woff2" };
  const server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      if (!path.startsWith(base)) { res.writeHead(404).end(); return; }
      const file = resolve(root, path.slice(base.length) || "index.html");
      if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
      if (path.endsWith("favicon.ico")) { res.writeHead(204).end(); return; }
      const body = await readFile(file);
      res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream", "content-length": body.length }); res.end(body);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${server.address().port}${base}`, close: () => new Promise((r) => server.close(r)) };
}
export async function preview(page, previous = "") {
  await page.waitForFunction((prev) => {
    const f = document.querySelector("iframe:not(.back)");
    return f?.getAttribute("src")?.startsWith("blob:") && f.getAttribute("src") !== prev;
  }, previous, { timeout: 90000 });
  return page.evaluate(async () => {
    const url = document.querySelector("iframe:not(.back)").getAttribute("src");
    return { url, bytes: Array.from(new Uint8Array(await (await fetch(url)).arrayBuffer())) };
  });
}
export function observe(page) {
  const requests = [], errors = [];
  page.on("response", (r) => {
    if (!/^https?:/.test(r.url())) return;
    requests.push({ url: new URL(r.url()).pathname, status: r.status(), bytes: Number(r.headers()["content-length"] || 0) });
    if (r.status() >= 400) errors.push(`HTTP ${r.status()}: ${r.url()}`);
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  return { requests, errors };
}
