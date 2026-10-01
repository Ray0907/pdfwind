import { parse, compileScript } from "vue/compiler-sfc";
import { readFileSync } from "node:fs";
const src = readFileSync("src/components/Badge/Badge.vue", "utf8");
const { descriptor } = parse(src, { filename: "Badge.vue" });
const r = compileScript(descriptor, { id: "x" });
console.log(Object.keys(r), r.scriptSetupAst?.length, r.scriptSetupAst?.[1]?.type);
const call = r.scriptSetupAst.flatMap((n) => [n]).find((n) => JSON.stringify(n.declarations ?? n.expression ?? "").includes("defineProps"));
console.log(call?.type, call?.start, call?.end, JSON.stringify(src.slice(call.start, call.start + 60)), descriptor.scriptSetup.loc.start.offset);
