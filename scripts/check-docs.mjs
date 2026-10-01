// Offline documentation check. Run from the repository root (or a scratch copy).
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = process.cwd();
const docs = ["README.md", "CONTRIBUTING.md", "SECURITY.md", "CHANGELOG.md", "CODE_OF_CONDUCT.md"];
const errors = [], cache = new Map();
let links = 0, images = 0, anchors = 0, external = 0;
// ponytail: supports these docs' inline/reference links, HTML href/src and ATX headings;
// use a Markdown parser if the docs adopt more syntax (e.g. Setext headings).
const prose = (text) => text.replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1[ \t]*(?:\n|$)/gm, "").replace(/<!--[\s\S]*?-->/g, "");
const label = (text) => text.trim().replace(/\s+/g, " ").toLowerCase();
const headings = (file) => {
  if (cache.has(file)) return cache.get(file);
  const text = prose(readFileSync(file, "utf8")), ids = new Set(), used = new Map();
  for (const match of text.matchAll(/^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const slug = match[1].replace(/<[^>]*>/g, "").replace(/!?\[([^\]]+)\]\([^)]*\)/g, "$1")
      .toLowerCase().replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu, "").replace(/\s/g, "-");
    let id = slug, n = used.get(slug) || 0;
    while (ids.has(id)) id = `${slug}-${++n}`;
    used.set(slug, n); ids.add(id);
  }
  for (const match of text.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)) ids.add(match[1]);
  cache.set(file, ids); return ids;
};
const check = (doc, href, image) => {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) { external++; return; }
  image ? images++ : links++;
  try {
    const hash = href.indexOf("#"), path = (hash < 0 ? href : href.slice(0, hash)).split("?")[0];
    const file = path ? resolve(path.startsWith("/") ? root : dirname(resolve(root, doc)), decodeURIComponent(path).replace(/^\//, "")) : resolve(root, doc);
    if (!existsSync(file)) { errors.push(`${doc}: missing file: ${href}`); return; }
    if (hash >= 0 && href.slice(hash + 1)) {
      anchors++;
      const id = decodeURIComponent(href.slice(hash + 1));
      if (!statSync(file).isFile() || !headings(file).has(id)) errors.push(`${doc}: missing anchor: ${href}`);
    }
  } catch (e) { errors.push(`${doc}: invalid target ${href}: ${e.message}`); }
};
for (const doc of docs) {
  if (!existsSync(resolve(root, doc))) { errors.push(`${doc}: missing document`); continue; }
  const text = prose(readFileSync(resolve(root, doc), "utf8"));
  const refs = new Map([...text.matchAll(/^ {0,3}\[([^\]]+)\]:\s*(<[^>]+>|\S+)/gm)].map((m) => [label(m[1]), m[2].replace(/^<|>$/g, "")]));
  const body = text.replace(/^ {0,3}\[[^\]]+\]:[^\n]*$/gm, "").replace(/`+[^`\n]*`+/g, "");
  for (const match of body.matchAll(/(!?)\[([^\]\n]+)\](?:\(\s*(<[^>\n]+>|[^\s)]+)(?:\s+["'][^)]*)?\s*\)|\[([^\]\n]*)\])?/g)) {
    const [, image, title, inline, reference] = match;
    const key = label(reference || title), href = inline?.replace(/^<|>$/g, "") ?? refs.get(key);
    if (href) check(doc, href, !!image);
    else if (reference !== undefined) errors.push(`${doc}: undefined reference: ${key}`);
  }
  for (const match of body.matchAll(/\b(href|src)\s*=\s*["']([^"']+)["']/g)) check(doc, match[2], match[1] === "src");
}
console.log(`Docs: ${docs.length} documents, ${links} relative links, ${images} local images, ${anchors} heading anchors; ${external} external targets skipped (offline); ${errors.length} errors.`);
for (const error of errors) console.error(error);
process.exitCode = errors.length ? 1 : 0;
