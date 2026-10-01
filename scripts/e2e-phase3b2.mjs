// Phase 3b-2 E2E: lesson-plan, medical-intake-form, meeting-minutes, packing-slip, press-release, shipping-label, work-order.
// Text for every section, math/derived values from props, 2-page behavior, form fields drawn (pixels), QR decode, page sizes vs the
// pdfcn reference PDFs, CJK, class passthrough, Chromium parity, mutation checks, compare PNGs (ours left, pdfcn right). Writes out/phase3b2/.
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createServer } from "vite";
import { chromium } from "playwright-core";
import jsQR from "jsqr";
import { load, pageCount, allText, words, find, raster, colorStats, fonts, hex } from "./lib/pdf.mjs";

const OUT = "out/phase3b2", REF = "/tmp/pdfcn-ref";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/compare`, { recursive: true });

const rows = [];
const check = (group, name, pass, detail = "") => rows.push({ group, name, pass: !!pass, detail: String(detail) });
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const f1 = (n) => (Math.round(n * 10) / 10).toString();
const norm = (s) => s.replace(/\s+/g, " ").trim();
const sh = (c, a) => execFileSync(c, a, { encoding: "utf8" });
const pageSize = (f) => (sh("pdfinfo", [f]).match(/Page size:\s+([\d.]+) x ([\d.]+)/) ?? []).slice(1).map(Number);

const { renderPdf, demos, close, blocks } = await load();
const B = await blocks();
const { h } = await import("vue");
const file = (n) => `${OUT}/${n}.pdf`;
const T = (n) => norm(allText(file(n)).join("\n"));
const PT = (n) => allText(file(n)).map(norm);
const W = (n, p) => words(file(n), p);
const pagesOf = (n) => Array.from({ length: pageCount(file(n)) }, (_, i) => i + 1);
const R = (n, p = 1, dpi = 144) => raster(file(n), p, { dpi });
const section = async (g, fn) => { try { await fn(); } catch (e) { check(g, "section ran without throwing", false, String(e?.stack ?? e).split("\n").slice(0, 3).join(" | ")); } };
const has = (txt, list) => list.filter((s) => !txt.includes(norm(s)));
// wrapped cells/columns interleave in layout text: a string passes if contiguous or all its words are present
const hasW = (txt, list) => list.filter((s) => !txt.includes(norm(s)) && !norm(s).split(" ").every((w) => txt.includes(w)));
const money = (n) => `$${(Math.round(n * 100) / 100).toFixed(2)}`;
// longest horizontal run of non-white pixels in each pixel row of [y0,y1) (pt -> px via dpi/72); returns rows with a run >= minPt
const hrules = (img, dpi, y0, y1, x0, x1, minPt, dark = 235) => {
  const s = dpi / 72, out = [];
  for (let y = Math.floor(y0 * s); y < Math.min(img.h, Math.ceil(y1 * s)); y++) {
    let run = 0, best = 0;
    for (let x = Math.floor(x0 * s); x < Math.min(img.w, Math.ceil(x1 * s)); x++) { const i = (y * img.w + x) * 3; if (img.px[i] < dark && img.px[i + 1] < dark && img.px[i + 2] < dark) { run++; best = Math.max(best, run); } else run = 0; }
    if (best / s >= minPt) out.push(y / s);
  }
  // merge adjacent rows into one rule
  return out.reduce((a, y) => (a.length && y - a.at(-1) < 1.5 ? (a[a.length - 1] = y, a) : [...a, y]), []);
};

const BL = {
  "lesson-plan": { Comp: B.LessonPlan, opts: B.lessonPlanOptions, sample: B.lessonPlanSample, pages: 2, size: "a4" },
  "medical-intake-form": { Comp: B.MedicalIntakeForm, opts: B.medicalIntakeFormOptions, sample: B.medicalIntakeFormSample, pages: 2, size: "a4" },
  "meeting-minutes": { Comp: B.MeetingMinutes, opts: B.meetingMinutesOptions, sample: B.meetingMinutesSample, pages: 2, size: "a4" },
  "packing-slip": { Comp: B.PackingSlip, opts: B.packingSlipOptions, sample: B.packingSlipSample, pages: 1, size: "a4" },
  "press-release": { Comp: B.PressRelease, opts: B.pressReleaseOptions, sample: B.pressReleaseSample, pages: 1, size: "a4" },
  "shipping-label": { Comp: B.ShippingLabel, opts: B.shippingLabelOptions, sample: B.shippingLabelSample, pages: 1, size: "label" },
  "work-order": { Comp: B.WorkOrder, opts: B.workOrderOptions, sample: B.workOrderSample, pages: 1, size: "a4" },
};
const render = (b, data, extra = {}, props = {}) => renderPdf(b.Comp, { data, ...props }, { ...b.opts, ...extra });
const out = async (name, b, data, props) => { writeFileSync(file(name), await render(b, data, { metadata: { title: name } }, props)); };

// ================= every block: options, page size, page count, compare PNGs =================
for (const [name, b] of Object.entries(BL)) await section(name, async () => {
  const g = name;
  check(g, "block exports renderOptions (page size / margins / footer band) that renderPdf accepts unchanged", !!b.opts && b.opts.size !== undefined && b.opts.margin !== undefined, `size ${JSON.stringify(b.opts.size)}, margin ${JSON.stringify(b.opts.margin)}, footer ${b.opts.footer ? "yes" : "none"}`);
  await out(name, b, b.sample);
  const [w, hh] = pageSize(file(name)), [rw, rh] = pageSize(`${REF}/${name}.pdf`);
  check(g, "page size equals the pdfcn reference PDF (pdfinfo)", near(w, rw, 0.6) && near(hh, rh, 0.6), `ours ${f1(w)} x ${f1(hh)} pt, reference ${f1(rw)} x ${f1(rh)} pt`);
  const np = pageCount(file(name)), rp = pageCount(`${REF}/${name}.pdf`);
  check(g, `${b.pages} page(s), same as the reference`, np === b.pages && rp === b.pages, `ours ${np}, reference ${rp}`);
  for (let p = 1; p <= np; p++) {
    raster(file(name), p, { dpi: 60, png: `${OUT}/ours-${name}-${p}` });
    if (existsSync(`${REF}/${name}-${p}.png`)) execFileSync("magick", [`${OUT}/ours-${name}-${p}.png`, "-size", "8x10", "xc:#d4d4d8", `${REF}/${name}-${p}.png`, "-background", "#d4d4d8", "-gravity", "north", "+append", `${OUT}/compare/${name}-${p}.png`]);
  }
  check(g, "side-by-side compare PNGs written (ours left, pdfcn right)", Array.from({ length: np }, (_, i) => existsSync(`${OUT}/compare/${name}-${i + 1}.png`)).every(Boolean), `out/phase3b2/compare/${name}-1..${np}.png`);
  // text inside the page
  const ws = pagesOf(name).flatMap((p) => W(name, p)), outside = ws.filter((x) => x.x0 < -0.5 || x.y0 < -0.5 || x.x1 > w + 0.5 || x.y1 > hh + 0.5);
  check(g, "all text inside the page", !outside.length, outside.length ? outside.map((x) => x.t).join(",") : `${ws.length} words inside`);
  // defaults: no props, neutral sample, no brand text
  const def = await renderPdf(b.Comp, {}, { ...b.opts }); writeFileSync(file(`default-${name}`), def);
  check(g, "renders with no props (neutral default data) and contains no pdfcn text", pageCount(file(`default-${name}`)) === b.pages && !/pdfcn/i.test(T(`default-${name}`)) && !/pdfcn/i.test(T(name)), `${pageCount(file(`default-${name}`))} page(s)`);
  // class passthrough
  writeFileSync(file(`pass-${name}`), await renderPdf({ render: () => h(b.Comp, { data: b.sample, class: "bg-[#ff00ff]" }) }, {}, { ...b.opts }));
  const n = colorStats(R(`pass-${name}`, 1), hex("#ff00ff"), { tol: 10 }).n;
  check(g, "class passthrough on the root (bg-[#ff00ff] paints the block)", n > 20000, `${n} magenta px @144dpi`);
});

const footerOn = (name, extra = "") => PT(name).every((p, i, a) => p.includes(`Page ${i + 1} of ${a.length}`) && (!extra || p.includes(extra)));
const noOverlap = (name, g, h0) => {
  const clip = pagesOf(name).map((p) => { const ws = W(name, p), foot = Math.min(...ws.filter((w) => w.y0 > h0).map((w) => w.y0)), body = Math.max(...ws.filter((w) => w.y0 < h0).map((w) => w.y1)); return { p, foot, body }; });
  check(g, "no clipped or overlapping content: body ends above the footer on every page", clip.every((c) => c.body < c.foot - 4), clip.map((c) => `p${c.p} body ${f1(c.body)} < footer ${f1(c.foot)}`).join("; "));
};

// ================= lesson plan =================
await section("lesson-plan", async () => {
  const g = "lesson-plan", b = BL[g], s = b.sample, txt = T(g), pages = PT(g);
  const must = [s.lessonTitle, `Lesson Plan · ${s.topic}`, s.date, "SUBJECT", s.subject, "GRADE LEVEL", s.gradeLevel, "TEACHER", s.teacherName, "DURATION", s.duration, "ESSENTIAL QUESTION", s.essentialQuestion, "OBJECTIVES", "Students will be able to (SWBAT):", ...s.objectives.map((o, i) => `${i + 1}. ${o}`), "STANDARDS", ...s.standards, "MATERIALS", ...s.materials, "LESSON SEQUENCE", "Time", "Activity", "Description", "Notes", ...s.sequence.flatMap((r) => [r.time, r.activity, r.description, r.notes]), "DIFFERENTIATION", ...s.differentiation, "FORMATIVE ASSESSMENT", ...s.assessment.formative, "SUMMATIVE ASSESSMENT", ...s.assessment.summative, "HOMEWORK", s.homework, "TEACHER REFLECTION"];
  const miss = hasW(txt, must);
  check(g, "every section present: header, 4-field info row, essential question, objectives, standards, materials, 5-row sequence, differentiation, assessments, homework, reflection", !miss.length, miss.length ? `missing: ${miss.slice(0, 6).join(" | ")}` : `${must.length} strings`);
  check(g, "2-page split like the reference: sequence on p1, differentiation..reflection on p2, header only on p1", pages[0].includes("LESSON SEQUENCE") && pages[0].includes(`Lesson Plan · ${s.topic}`) && !pages[1].includes(`Lesson Plan · ${s.topic}`) && pages[1].includes("DIFFERENTIATION") && pages[1].includes("TEACHER REFLECTION") && !pages[0].includes("DIFFERENTIATION"), pages.map((p, i) => `p${i + 1} ${p.length} chars`).join(", "));
  check(g, "footer band on both pages: 'Subject · Grade · Title' and 'Page n of 2'", footerOn(g, `${s.subject} · ${s.gradeLevel} · ${s.lessonTitle}`), (pages.map((p) => (p.match(/Page \d of \d/) ?? ["-"])[0])).join(" | "));
  noOverlap(g, g, 770);
  // derived total from props: sum of the minutes
  const sum = s.sequence.reduce((a, r) => a + parseInt(r.time), 0);
  check(g, `derived total: sequence minutes sum to ${sum} and the footer row says it matches the "${s.duration}" lesson`, txt.includes(`${sum} min Total matches the ${s.duration} lesson`), txt.match(/\d+ min Total[^]{0,50}/)?.[0]);
  const s2 = { ...s, duration: "45 minutes", sequence: s.sequence.map((r, i) => (i === 0 ? { ...r, time: "10 min" } : r)) };
  await out("math-lesson", b, s2);
  check(g, "props drive it: first step 10 min + 45-minute lesson -> '55 min Total planned 45 minutes' (no false 'matches')", T("math-lesson").includes("55 min Total planned 45 minutes") && !T("math-lesson").includes("matches the"), T("math-lesson").match(/\d+ min Total[^]{0,40}/)?.[0]);
  // table drawn: zebra rows + grid lines on p1, 8 ruled reflection lines on p2
  const ws2 = W(g, 2), refl = find(ws2, "REFLECTION"), img2 = raster(file(g), 2, { dpi: 72 }), rules = hrules(img2, 72, refl.y1 + 4, 770, 56, 540, 300, 248);
  check(g, "teacher reflection: 8 ruled writing lines drawn under the heading (pixel rows)", rules.length === 8, `${rules.length} rules at y ${rules.map(f1).join(", ")}`);
  const img1 = raster(file(g), 1, { dpi: 72 }), t0 = find(W(g, 1), "Time").y0, vcols = [];
  for (let x = 56; x < 540; x++) { let run = 0, best = 0; for (let y = Math.floor(t0); y < Math.min(img1.h, Math.floor(t0) + 230); y++) { const i = (y * img1.w + x) * 3; if (img1.px[i] < 242) { run++; best = Math.max(best, run); } else run = 0; } if (best > 150 && (!vcols.length || x - vcols.at(-1) > 2)) vcols.push(x); }
  check(g, "sequence table grid drawn: vertical column rules (>= 3 interior + 2 outer, each > 150pt tall)", vcols.length >= 5, `${vcols.length} vertical rules at x ${vcols.join(",")}`);
  const tint = colorStats(R(g, 1), hex("#7c3aed"), { tol: 12 }).n;
  check(g, "accent color (#7c3aed) drawn on the essential-question block", tint > 150, `${tint} px`);
  await out("accent-lesson", b, { ...s, accentColor: "#dc2626" });
  check(g, "props drive it: accentColor #dc2626 replaces the violet", colorStats(R("accent-lesson", 1), hex("#dc2626"), { tol: 12 }).n > 150 && colorStats(R("accent-lesson", 1), hex("#7c3aed"), { tol: 12 }).n < 30, "");
  const cjk = { ...s, lessonTitle: "線性方程式入門", subject: "數學", teacherName: "王老師", essentialQuestion: "我們如何用線性方程式表示現實關係？", objectives: ["定義線性方程式", ...s.objectives.slice(1)], sequence: s.sequence.map((r, i) => (i === 0 ? { ...r, activity: "暖身", description: "複習一步方程式", notes: "黑板上五題" } : r)) };
  await out("cjk-lesson", b, cjk);
  const ct = T("cjk-lesson"), cm = has(ct, ["線性方程式入門", "數學", "王老師", "我們如何用線性方程式表示現實關係？", "定義線性方程式", "暖身", "複習一步方程式", "黑板上五題"]);
  check(g, "CJK title, subject, teacher, question, objective and sequence row render (Noto embedded); still 2 pages", !cm.length && /Noto/.test(fonts(file("cjk-lesson"))) && pageCount(file("cjk-lesson")) === 2, cm.length ? `missing ${cm.join(", ")}` : "all present");
});

// ================= medical intake form =================
await section("medical-intake-form", async () => {
  const g = "medical-intake-form", b = BL[g], s = b.sample, txt = T(g), pages = PT(g);
  const must = [s.clinicName, s.clinicPhone, "Patient Intake Form", s.clinicAddress, "PATIENT INFORMATION", "FULL NAME", "PHONE NUMBER", "+1 (555) 000-0000", "DATE OF BIRTH", "DD / MM / YYYY", "EMAIL ADDRESS", "GENDER", "ADDRESS", "STREET ADDRESS", "CITY", "STATE / PROVINCE", "POSTAL CODE", "EMERGENCY CONTACT", "EMERGENCY CONTACT NAME", "RELATIONSHIP", "INSURANCE", "INSURANCE PROVIDER", "POLICY NUMBER", "GROUP NUMBER", "SUBSCRIBER NAME", `${s.clinicName} — Patient Intake Form (continued)`, "MEDICAL HISTORY", "Diabetes", "High Blood Pressure", "Heart Disease", "Asthma", "COPD", "Cancer", "Thyroid Disorder", "Kidney Disease", "Liver Disease", "Stroke", "Seizures / Epilepsy", "Other", "CURRENT MEDICATIONS", "Medication", "Dosage", "Frequency", "Prescribing Doctor", "ALLERGIES", "Allergen", "Reaction", "Severity", "REASON FOR VISIT", "CONSENT & AUTHORIZATION", `I authorize ${s.clinicName} to provide treatment`, "Notice of Privacy Practices (HIPAA)", "I have read and understand the consent above.", "I have received the Notice of Privacy Practices.", "Patient / Guardian Signature", "Date", "Form v1.0 · Revised 09/2026"];
  const miss = has(txt, must);
  check(g, "every section present: header, personal info (+hints), emergency contact, insurance, history checklist, medications, allergies, reason, consent, signature, form footer", !miss.length, miss.length ? `missing: ${miss.slice(0, 6).join(" | ")}` : `${must.length} strings`);
  check(g, "2-page behavior: form fields on p1, continued header + history..signature on p2", pages[0].includes("PATIENT INFORMATION") && pages[0].includes("INSURANCE") && !pages[0].includes("MEDICAL HISTORY") && pages[1].includes("(continued)") && pages[1].includes("CONSENT & AUTHORIZATION") && !pages[1].includes("PATIENT INFORMATION"), pages.map((p, i) => `p${i + 1} ${p.length} chars`).join(", "));
  check(g, "footer band on both pages: form version, clinic phone and 'Page n of 2'", footerOn(g, "Form v1.0 · Revised 09/2026") && pages.every((p) => p.includes(s.clinicPhone)), pages.map((p) => (p.match(/Page \d of \d/) ?? ["-"])[0]).join(" | "));
  noOverlap(g, g, 770);
  // form fields drawn: under-field rules on p1 (Form component), checklist boxes + grid tables on p2, signature line
  const i1 = raster(file(g), 1, { dpi: 72 }), fr = hrules(i1, 72, 90, 760, 48, 550, 60, 248);
  check(g, "p1: field underline rules drawn (>= 12 horizontal rules >= 60pt, 2-column layout)", fr.length >= 12, `${fr.length} rules`);
  const i2 = raster(file(g), 2, { dpi: 72 }), ws2 = W(g, 2), dia = find(ws2, "Diabetes"), cb = colorStats(i2, [150, 150, 150], { tol: 100, box: { x0: Math.floor(dia.x0 - 18), y0: Math.floor(dia.y0 - 2), x1: Math.floor(dia.x0 - 1), y1: Math.ceil(dia.y1 + 2) } }).n;
  check(g, "p2: checkbox drawn left of each checklist item (outline pixels beside 'Diabetes') and unchecked", cb > 8 && cb < 80, `${cb} outline px`);
  const sig = find(ws2, "Signature"), sr = hrules(i2, 72, sig.y0 - 30, sig.y0, 48, 550, 100, 248);
  check(g, "p2: signature + date lines drawn above 'Patient / Guardian Signature' and 'Date'", sr.length >= 1, `${sr.length} line(s) at y ${sr.map(f1).join(",")}`);
  const med = find(ws2, "MEDICATIONS"), all = find(ws2, "ALLERGIES"), tr = hrules(i2, 72, med.y1, all.y0, 48, 550, 300, 248);
  check(g, "p2: medications grid table drawn with blank writing rows (>= 3 full-width rules)", tr.length >= 3, `${tr.length} rules`);
  const teal = colorStats(R(g, 2), hex("#0d9488"), { tol: 14 }).n;
  check(g, "accent color (#0d9488) drawn on the p2 section rules and consent block", teal > 300, `${teal} px`);
  // toggles
  await out("toggle-medical", b, { ...s, emergencyContact: false, insurance: false, allergies: false });
  const tt = T("toggle-medical");
  check(g, "section toggles: emergencyContact/insurance/allergies=false remove those sections, others stay", !tt.includes("EMERGENCY CONTACT") && !tt.includes("INSURANCE") && !tt.includes("ALLERGIES") && tt.includes("PATIENT INFORMATION") && tt.includes("MEDICAL HISTORY") && tt.includes("CURRENT MEDICATIONS"), `${pageCount(file("toggle-medical"))} page(s)`);
  await out("toggle-medical2", b, { ...s, personalInfo: false, consent: false, medicalHistory: false, medications: false, reasonForVisit: false });
  const t2 = T("toggle-medical2");
  check(g, "section toggles: personalInfo/consent/medicalHistory/medications/reasonForVisit=false", !t2.includes("PATIENT INFORMATION") && !t2.includes("CONSENT") && !t2.includes("MEDICAL HISTORY") && !t2.includes("CURRENT MEDICATIONS") && !t2.includes("REASON FOR VISIT") && t2.includes("EMERGENCY CONTACT") && t2.includes("ALLERGIES"), "");
  const cjk = { ...s, clinicName: "晨光家庭診所", clinicAddress: "臺北市中正區健康路二百號", clinicPhone: "(02) 2345-6789" };
  await out("cjk-medical", b, cjk);
  const ct = T("cjk-medical"), cm = has(ct, ["晨光家庭診所", "臺北市中正區健康路二百號", "(02) 2345-6789", "晨光家庭診所 — Patient Intake Form (continued)", "I authorize 晨光家庭診所 to provide treatment"]);
  check(g, "CJK clinic name, address and phone render in header, p2 header, consent text and footer (Noto embedded)", !cm.length && /Noto/.test(fonts(file("cjk-medical"))), cm.length ? `missing ${cm.join(", ")}` : "all present");
});

// ================= meeting minutes =================
await section("meeting-minutes", async () => {
  const g = "meeting-minutes", b = BL[g], s = b.sample, txt = T(g), pages = PT(g);
  const who = (p) => `${p.name} — ${p.role}`;
  const must = [s.meetingTitle, s.date, s.time, s.location, `Organized by ${s.organizer}`, "ATTENDEES", ...s.attendees.map(who), "ABSENT", ...s.absent.map(who), "GUESTS", ...s.guests, "AGENDA", ...s.agenda.map((a, i) => `${i + 1}. ${a}`), "DISCUSSION", ...s.discussions.flatMap((d) => [d.topic, d.speaker, ...d.notes]), "DECISIONS", ...s.decisions.flatMap((d) => [`${d.number}. ${d.decision}`, d.rationale].filter(Boolean)), "ACTION ITEMS", "Task", "Owner", "Due Date", "Status", ...s.actionItems.flatMap((a) => [a.task, a.owner, a.dueDate, a.status]), "NEXT MEETING", `${s.nextMeeting.date} · ${s.nextMeeting.time}`, ...s.nextMeeting.agenda, `Prepared by ${s.preparedBy}`, `Distribution: ${s.distributionList.join(", ")}`];
  const miss = hasW(txt, must);
  check(g, "every section present: header, attendees/absent/guests, agenda, discussions, decisions + rationale, action items, next meeting, prepared-by, distribution", !miss.length, miss.length ? `missing: ${miss.slice(0, 6).join(" | ")}` : `${must.length} strings`);
  check(g, "2-page behavior: header..discussion on p1, decisions/action items/next meeting on p2, header only on p1", pages[0].includes("DISCUSSION") && pages[0].includes(s.meetingTitle) && !pages[0].includes("DECISIONS") && pages[1].includes("DECISIONS") && pages[1].includes("NEXT MEETING") && !pages[1].includes(s.meetingTitle), pages.map((p, i) => `p${i + 1} ${p.length} chars`).join(", "));
  check(g, "footer on both pages: prepared-by, distribution, 'Page n of 2'", footerOn(g, `Prepared by ${s.preparedBy}`) && pages.every((p) => p.includes("Distribution:")), pages.map((p) => (p.match(/Page \d of \d/) ?? ["-"])[0]).join(" | "));
  noOverlap(g, g, 770);
  // statuses -> badges: three distinct badge colors drawn, mapped from props
  const ws2 = W(g, 2), i2 = R(g, 2), pos = (t) => { const w = find(ws2, t); return { x0: Math.floor((w.x0 - 6) * 2), y0: Math.floor((w.y0 - 3) * 2), x1: Math.ceil((w.x1 + 6) * 2), y1: Math.ceil((w.y1 + 3) * 2) }; };
  const nonWhite = (t) => { const bx = pos(t); let n = 0; for (let y = bx.y0; y < bx.y1; y++) for (let x = bx.x0; x < bx.x1; x++) { const i = (y * i2.w + x) * 3; if (i2.px[i] < 225 || i2.px[i + 1] < 225 || i2.px[i + 2] < 225) n++; } return n; };
  const ip = find(ws2, "Progress"), ns = find(ws2, "Not"), cp = find(ws2, "Complete");
  check(g, "status badges drawn (outline pill around each status text; 3 rows, in the Status column)", ip && ns && cp && nonWhite("Progress") > 200 && nonWhite("Complete") > 200, `In Progress ${nonWhite("Progress")}px, Complete ${nonWhite("Complete")}px`);
  const green = colorStats(i2, hex("#16a34a"), { tol: 60, box: pos("Complete") }).n, blue = colorStats(i2, hex("#0284c7"), { tol: 60, box: pos("Progress") }).n;
  check(g, "Complete badge is greener than In Progress, which is blue (status -> variant mapping)", green > 20 && blue > 20, `green ${green}px, blue ${blue}px`);
  const s2 = { ...s, actionItems: s.actionItems.map((a) => ({ ...a, status: "Complete" })) };
  await out("status-meeting", b, s2);
  const st = T("status-meeting");
  check(g, "props drive it: all items Complete -> 3x 'Complete', no 'Not Started' / 'In Progress'", (st.match(/Complete/g) ?? []).length === 3 && !st.includes("Not Started") && !st.includes("In Progress"), `${(st.match(/Complete/g) ?? []).length} Complete`);
  await out("minimal-meeting", b, { ...s, absent: undefined, guests: undefined, decisions: [{ number: 1, decision: "Only decision" }], nextMeeting: undefined, distributionList: undefined });
  const mt = T("minimal-meeting");
  check(g, "optional parts omitted: no ABSENT/GUESTS/NEXT MEETING/Distribution; decision without rationale; still renders", !mt.includes("ABSENT") && !mt.includes("GUESTS") && !mt.includes("NEXT MEETING") && !mt.includes("Distribution") && mt.includes("1. Only decision") && mt.includes("ACTION ITEMS"), `${pageCount(file("minimal-meeting"))} page(s)`);
  const cjk = { ...s, meetingTitle: "第三季產品路線圖審查", location: "會議室 B", organizer: "金亞歷", preparedBy: "金亞歷", attendees: [{ name: "王小明", role: "產品負責人" }, ...s.attendees.slice(1)], agenda: ["回顧第二季成果", ...s.agenda.slice(1)], actionItems: s.actionItems.map((a, i) => (i === 0 ? { ...a, task: "撰寫匯出引擎提案", owner: "李大華" } : a)) };
  await out("cjk-meeting", b, cjk);
  const ct = T("cjk-meeting"), cm = has(ct, ["第三季產品路線圖審查", "會議室 B", "Organized by 金亞歷", "王小明 — 產品負責人", "回顧第二季成果", "撰寫匯出引擎提案", "李大華", "Prepared by 金亞歷"]);
  check(g, "CJK title, location, organizer, attendee, agenda, action item and footer render (Noto embedded)", !cm.length && /Noto/.test(fonts(file("cjk-meeting"))), cm.length ? `missing ${cm.join(", ")}` : "all present");
});

// ================= packing slip =================
await section("packing-slip", async () => {
  const g = "packing-slip", b = BL[g], s = b.sample, txt = T(g);
  const lt = (i) => i.qtyPacked * i.unitPrice;
  const packed = s.items.reduce((a, i) => a + i.qtyPacked, 0), ordered = s.items.reduce((a, i) => a + i.qtyOrdered, 0);
  const must = ["PACKING SLIP", s.companyName, s.orderNumber, `Order Date: ${s.orderDate}`, "SHIP TO", s.shipTo.name, s.shipTo.address, "Portland, OR 97201", s.shipTo.phone, "FROM", s.shipFrom.name, s.shipFrom.address, "Seattle, WA 98101", "ORDER", `PO: ${s.poNumber}`, "Item", "SKU", "Packed", "Ordered", "Unit Price", "Total", ...s.items.flatMap((i) => [i.name, i.sku, money(i.unitPrice), money(lt(i))]), "SHIPPING", `${s.shipping.carrier} — ${s.shipping.method}`, `Tracking: ${s.shipping.trackingNumber}`, `Est. Delivery: ${s.shipping.estimatedDelivery}`, "Items Packed", `${packed} of ${ordered}`, "Packages", "Total Weight", s.totalWeight, s.thankYouMessage, s.returnsPolicy, s.customerService];
  const miss = hasW(txt, must);
  check(g, "every section present: header, order meta, ship to/from, 3 item rows with line totals, shipping, summary, thank you, returns, customer service", !miss.length, miss.length ? `missing: ${miss.slice(0, 6).join(" | ")}` : `${must.length} strings`);
  check(g, `derived: Items Packed '${packed} of ${ordered}' and each line total = packed qty x unit price (99.98 / 29.99 / 19.00)`, txt.includes(`Items Packed ${packed} of ${ordered}`) && ["$99.98", "$29.99", "$19.00"].every((x) => txt.includes(x)), "");
  const s2 = { ...s, items: [{ name: "Alpha", sku: "A-1", qtyPacked: 3, qtyOrdered: 4, unitPrice: 12.35 }, { name: "Beta", sku: "B-2", qtyPacked: 4, qtyOrdered: 4, unitPrice: 0.1 }] };
  await out("math-packing", b, s2);
  const mt = T("math-packing");
  check(g, "props drive it: 3x12.35=$37.05, 4x0.10=$0.40, '7 of 8' (not the sample values)", mt.includes("$37.05") && mt.includes("$0.40") && mt.includes("Items Packed 7 of 8") && !mt.includes("$99.98"), mt.match(/Items Packed[^]{0,12}/)?.[0]);
  await renderPdf(b.Comp, { data: s2, currency: "EUR", locale: "de-DE" }, { ...b.opts }).then((x) => writeFileSync(file("eur-packing"), x));
  check(g, "currency/locale props: EUR + de-DE renders euro amounts with comma decimals", /37,05\s*€/.test(T("eur-packing")) && !T("eur-packing").includes("$"), T("eur-packing").match(/\d+,\d\d\s*€/)?.[0] ?? "no €");
  const foot = PT(g)[0];
  check(g, "footer band: customer service on the left, 'Page 1 of 1' on the right", foot.includes(`${s.customerService} Page 1 of 1`) || (foot.includes(s.customerService) && foot.includes("Page 1 of 1")), "");
  const im = R(g, 1), gr = hrules(im, 144, 150, 560, 56, 540, 300);
  check(g, "items table drawn: grid rules across the table (>= 4 full-width rules)", gr.length >= 4, `${gr.length} rules`);
  await out("minimal-packing", b, { ...s, poNumber: undefined, shipping: { ...s.shipping, estimatedDelivery: undefined }, totalWeight: undefined, returnsPolicy: undefined, thankYouMessage: undefined });
  const nt = T("minimal-packing");
  check(g, "optional fields omitted: no PO / Est. Delivery / Total Weight / returns / thank-you; still renders", !nt.includes("PO:") && !nt.includes("Est. Delivery") && !nt.includes("Total Weight") && !nt.includes("Returns accepted") && !nt.includes("Thank you") && nt.includes("Items Packed"), "");
  await out("cjk-packing", b, { ...s, companyName: "晨星商店", shipTo: { ...s.shipTo, name: "陳小姐", address: "中山路一段 100 號", city: "臺北" }, items: [{ ...s.items[0], name: "小工具專業版" }, ...s.items.slice(1)], thankYouMessage: "感謝您的訂購！" });
  const ct = T("cjk-packing"), cm = has(ct, ["晨星商店", "陳小姐", "中山路一段 100 號", "小工具專業版", "感謝您的訂購！"]);
  check(g, "CJK company, recipient, address, item name and thank-you render (Noto embedded); one page", !cm.length && pageCount(file("cjk-packing")) === 1 && /Noto/.test(fonts(file("cjk-packing"))), cm.length ? `missing ${cm.join(", ")}` : "all present");
});

// ================= press release =================
await section("press-release", async () => {
  const g = "press-release", b = BL[g], s = b.sample, txt = T(g);
  const must = [s.companyName, s.date, "FOR IMMEDIATE RELEASE", ...s.headline.split(" ").slice(0, 3), s.subheadline.split(" ").slice(0, 5).join(" "), `${s.dateline.city.toUpperCase()}, ${s.dateline.state} — ${s.date.toUpperCase()}`, ...s.body.map((p) => p.split(" ").slice(0, 6).join(" ")), s.quotes[0].text.split(" ").slice(0, 6).join(" "), `— ${s.quotes[0].author}, ${s.quotes[0].title}`, `ABOUT ${s.companyName.toUpperCase()}`, s.boilerplate, "MEDIA CONTACT", s.mediaContact.name, s.mediaContact.email, s.mediaContact.phone, "###", s.address, "GitHub · X"];
  const miss = has(txt, must);
  check(g, "every section present: company/date, release line, headline, subheadline, dateline, body, quote + attribution, about, media contact, ###, footer address + socials", !miss.length, miss.length ? `missing: ${miss.slice(0, 6).join(" | ")}` : `${must.length} strings`);
  check(g, "full headline, both body paragraphs and the full quote are intact (no truncation)", [s.headline, s.subheadline, ...s.body, `“${s.quotes[0].text}”`].every((x) => txt.replace(/- /g, "-").includes(norm(x))), "");
  const ws = W(g, 1), by = (t) => find(ws, t).y0, order = ["FOR", "Acme", "Launches", "Revolutionary", "SAN", "DocKit", "ABOUT", "MEDIA", "###"].map((t) => ({ t, y: t === "Acme" ? ws.filter((w) => w.t === "Acme")[1]?.y0 ?? 0 : by(t) }));
  check(g, "reading order top to bottom: release line < headline < dateline < body < quote < about < contact < ###", order.every((o, i) => !i || o.y >= order[i - 1].y), order.map((o) => `${o.t}@${f1(o.y)}`).join(" "));
  const blue = colorStats(R(g, 1), hex("#1e40af"), { tol: 14 }).n;
  check(g, "accent color (#1e40af) drawn: release line text + quote bar", blue > 400, `${blue} px`);
  const bar = colorStats(R(g, 1), hex("#1e40af"), { tol: 14, box: { x0: 90, y0: 700, x1: 140, y1: 1300 } });
  check(g, "quote left bar drawn as a vertical accent stripe (tall, narrow)", bar.n > 300 && bar.y1 - bar.y0 > 80 && bar.x1 - bar.x0 < 12, `${bar.n}px, ${bar.x1 - bar.x0 + 1}px wide x ${bar.y1 - bar.y0 + 1} tall`);
  await out("minimal-press", b, { ...s, subheadline: undefined, quotes: undefined, socialLinks: undefined, address: undefined });
  const nt = T("minimal-press");
  check(g, "optional fields omitted: no subheadline/quote/socials/address; body + boilerplate remain", !nt.includes(s.subheadline) && !nt.includes("We built DocKit") && !nt.includes("GitHub") && !nt.includes("Market St") && nt.includes(s.boilerplate) && nt.includes("###"), "");
  await out("long-press", b, { ...s, body: Array.from({ length: 12 }, (_, i) => `Paragraph ${i + 1}: ${s.body[1]}`) });
  const lp = PT("long-press");
  check(g, "long body flows onto a 2nd page with footer on every page and no loss (12 paragraphs)", lp.length >= 2 && Array.from({ length: 12 }, (_, i) => `Paragraph ${i + 1}:`).every((x) => lp.join(" ").includes(x)) && lp.every((p) => p.includes("Market St")), `${lp.length} pages`);
  const cjk = { ...s, companyName: "晨星科技", headline: "晨星科技推出革命性文件工具包", subheadline: "全新開源函式庫讓專業文件產生變得輕而易舉", dateline: { city: "臺北", state: "臺灣" }, body: ["晨星科技今日宣布推出開源元件庫。", ...s.body.slice(1)], quotes: [{ text: "我們打造它是因為用程式產生文件過於痛苦。", author: "王小明", title: "技術長" }], mediaContact: { ...s.mediaContact, name: "新聞團隊" } };
  await out("cjk-press", b, cjk);
  const ct = T("cjk-press"), cm = has(ct, ["晨星科技", "晨星科技推出革命性文件工具包", "全新開源函式庫讓專業文件產生變得輕而易舉", "臺北, 臺灣", "晨星科技今日宣布推出開源元件庫。", "我們打造它是因為用程式產生文件過於痛苦。", "— 王小明, 技術長", "新聞團隊"]);
  check(g, "CJK company, headline, subheadline, dateline, body, quote, attribution and contact render (Noto embedded)", !cm.length && /Noto/.test(fonts(file("cjk-press"))), cm.length ? `missing ${cm.join(", ")}` : "all present");
});

// ================= shipping label =================
await section("shipping-label", async () => {
  const g = "shipping-label", b = BL[g], s = b.sample, txt = T(g);
  const [w, hh] = pageSize(file(g));
  check(g, "exactly 288 x 432 pt (4 x 6 in) from the block's exported render options, no margins", near(w, 288, 0.6) && near(hh, 432, 0.6) && JSON.stringify(b.opts.size) === JSON.stringify({ width: 384, height: 576 }) && b.opts.margin === 0, `${f1(w)} x ${f1(hh)} pt`);
  const must = [s.carrier, s.serviceLevel.toUpperCase(), "SHIP TO", s.to.name, s.to.address, "New York, NY 10001, USA", s.to.phone, "FROM", s.from.name, s.from.address, "Los Angeles, CA", "90001, USA", "WEIGHT", s.weight, "DIMENSIONS", s.dimensions, "PACKAGES", "POSTAGE", s.postage, ...s.handlingLabels, s.trackingNumber];
  const miss = has(txt, must);
  check(g, "every section present: carrier + service, ship to/from, details table, handling tags, tracking number", !miss.length, miss.length ? `missing: ${miss.slice(0, 6).join(" | ")}` : `${must.length} strings`);
  const ws = W(g, 1), outside = ws.filter((x) => x.x0 < 6 || x.x1 > 282 || x.y1 > 426);
  check(g, "all text inside the 288 x 432 label border", !outside.length, outside.length ? outside.map((x) => x.t).join(",") : `${ws.length} words inside`);
  // QR decode
  const decode = (name) => { const q = raster(file(name), 1, { dpi: 300 }), rgba = new Uint8ClampedArray(q.w * q.h * 4); for (let i = 0, o = 0; i < q.px.length; i += 3, o += 4) { rgba[o] = q.px[i]; rgba[o + 1] = q.px[i + 1]; rgba[o + 2] = q.px[i + 2]; rgba[o + 3] = 255; } const hit = jsQR(rgba, q.w, q.h); return hit && new TextDecoder().decode(Uint8Array.from(hit.binaryData)); };
  const dec = decode(g);
  check(g, "the QR decodes (jsQR, 300dpi) to the tracking number", dec === s.trackingNumber, `decoded "${dec}"`);
  const tr = find(ws, s.trackingNumber), qrBox = colorStats(R(g, 1, 144), [20, 20, 20], { tol: 60, box: { x0: 150, y0: Math.floor((tr.y0 - 90) * 2), x1: 430, y1: Math.floor((tr.y0 - 4) * 2) } });
  check(g, "QR is drawn above the tracking number, centered on the label", qrBox.n > 800 && near((qrBox.x0 + qrBox.x1) / 4, 144, 12), `${qrBox.n} dark px, center x ${f1((qrBox.x0 + qrBox.x1) / 4)}pt`);
  await out("tracking-label", b, { ...s, trackingNumber: "1Z999AA10123456784" });
  check(g, "mutation: a different tracking number changes the QR payload (decodes to the new number, not the old)", decode("tracking-label") === "1Z999AA10123456784" && decode("tracking-label") !== dec, `decoded "${decode("tracking-label")}"`);
  await out("minimal-label", b, { ...s, postage: undefined, handlingLabels: undefined, weight: undefined, dimensions: undefined, to: { ...s.to, phone: undefined } });
  const nt = T("minimal-label");
  check(g, "postage defaults to 'PAID' when omitted; no handling tags/weight/dimensions/phone when absent", nt.includes("POSTAGE PAID") && !nt.includes("FRAGILE") && !nt.includes("WEIGHT") && !nt.includes("DIMENSIONS") && !nt.includes("(503)"), nt.match(/POSTAGE[^]{0,8}/)?.[0]);
  const bd = colorStats(R(g, 1), [24, 24, 27], { tol: 60, box: { x0: 0, y0: 0, x1: 40, y1: 864 } }).n;
  check(g, "outer label border drawn (dark frame near the left edge)", bd > 800, `${bd} px`);
  await out("cjk-label", b, { ...s, to: { name: "陳大文", address: "中山路一段 100 號", city: "臺北", state: "市", zip: "10041", country: "臺灣" }, handlingLabels: ["易碎品", "請勿倒置"] });
  const ct = T("cjk-label"), cm = has(ct, ["陳大文", "中山路一段 100 號", "易碎品", "請勿倒置", "臺灣"]);
  check(g, "CJK recipient, address, country and handling tags render (Noto embedded); one 288x432 page", !cm.length && pageCount(file("cjk-label")) === 1 && near(pageSize(file("cjk-label"))[1], 432, 0.6) && /Noto/.test(fonts(file("cjk-label"))), cm.length ? `missing ${cm.join(", ")}` : "all present");
});

// ================= work order =================
await section("work-order", async () => {
  const g = "work-order", b = BL[g], s = b.sample, txt = T(g);
  const parts = s.parts.reduce((a, p) => a + p.qty * p.unitPrice, 0), labor = s.labor.reduce((a, l) => a + l.hours * l.rate, 0), tax = Math.round((parts + labor) * s.taxRate * 100) / 100, grand = parts + labor + tax;
  const must = [s.companyName, "Work Order", `WO #${s.workOrderNumber}`, `Date: ${s.date}`, "PRIORITY", s.priority, s.jobType, "CUSTOMER", s.customer.name, s.customer.address, s.customer.phone, `Acct #: ${s.customer.accountNumber}`, "JOB INFO", `Technician: ${s.technician}`, `Job Type: ${s.jobType}`, "EQUIPMENT", s.equipment.description, s.equipment.makeModel, `S/N: ${s.equipment.serialNumber}`, `Location: ${s.equipment.location}`, "PARTS USED", "Part #", "Description", "Qty", "Unit Price", ...s.parts.flatMap((p) => [p.partNumber, p.description]), "LABOR", "Technician", "Hours", "Rate", ...s.labor.flatMap((l) => [l.description, l.technician, String(l.hours)]), "TECHNICIAN NOTES", s.technicianNotes, "CUSTOMER NOTES", s.customerNotes, "Customer Signature", "Technician Signature", "Customer approves work performed and charges above", s.warrantyInfo, "Page 1 of 1"];
  const miss = has(txt, must);
  check(g, "every section present: header, priority + job type badges, customer/job/equipment, parts, labor, notes, totals, signatures, approval, warranty footer", !miss.length, miss.length ? `missing: ${miss.slice(0, 6).join(" | ")}` : `${must.length} strings`);
  const exp = [`Parts Total ${money(parts)}`, `Labor Total ${money(labor)}`, `Tax (${s.taxRate * 100}%) ${money(tax)}`, `Grand Total ${money(grand)}`];
  check(g, `math from props: parts ${money(parts)}, labor ${money(labor)}, tax ${money(tax)}, grand ${money(grand)}`, exp.every((x) => txt.includes(x)), has(txt, exp).join(" | ") || exp.join(" · "));
  check(g, "line totals: 1 x 89.99, 1 x 24.50, 2.5 h x $95 = $237.50", ["$89.99", "$24.50", "$237.50", "$95.00"].every((x) => txt.includes(x)), "");
  const s2 = { ...s, taxRate: 0.1, parts: [{ partNumber: "X-1", description: "Thing", qty: 3, unitPrice: 10.1 }], labor: [{ description: "Work A", technician: "T", hours: 1.5, rate: 40 }, { description: "Work B", technician: "T", hours: 0.5, rate: 40 }] };
  await out("math-work", b, s2);
  const p2 = 3 * 10.1, l2 = 1.5 * 40 + 0.5 * 40, t2 = Math.round((p2 + l2) * 0.1 * 100) / 100, mt = T("math-work");
  check(g, `props drive it: 3 x 10.10 + two labor rows, 10% tax -> ${money(p2)} / ${money(l2)} / Tax (10%) ${money(t2)} / ${money(p2 + l2 + t2)}`, [`Parts Total ${money(p2)}`, `Labor Total ${money(l2)}`, `Tax (10%) ${money(t2)}`, `Grand Total ${money(p2 + l2 + t2)}`].every((x) => mt.includes(x)), mt.match(/Parts Total[^]{0,110}/)?.[0]);
  const negative = has(txt, [`Grand Total ${money(grand + 1)}`]);
  check(g, "mutation: the totals check rejects a wrong expectation (grand + $1 is reported missing)", negative.length === 1, `rejected "${negative[0]}"`);
  await out("notax-work", b, { ...s, taxRate: undefined });
  check(g, "no taxRate -> Tax (0%) $0.00 and grand total = parts + labor", T("notax-work").includes(`Tax (0%) $0.00 Grand Total ${money(parts + labor)}`), T("notax-work").match(/Tax[^]{0,40}/)?.[0]);
  // priority badge variants: 4 distinct fills
  const fills = {};
  for (const pr of ["Low", "Medium", "High", "Urgent"]) {
    await out(`prio-${pr}`, b, { ...s, priority: pr });
    const wp = find(W(`prio-${pr}`, 1), pr), im = R(`prio-${pr}`, 1), bx = { x0: Math.floor((wp.x0 - 6) * 2), y0: Math.floor((wp.y0 - 3) * 2), x1: Math.ceil((wp.x1 + 6) * 2), y1: Math.ceil((wp.y1 + 3) * 2) };
    let r = 0, gg = 0, bb = 0, n = 0; for (let y = bx.y0; y < bx.y1; y++) for (let x = bx.x0; x < bx.x0 + 6; x++) { const i = (y * im.w + x) * 3; r += im.px[i]; gg += im.px[i + 1]; bb += im.px[i + 2]; n++; }
    fills[pr] = [r, gg, bb].map((v) => Math.round(v / n)).join(",");
  }
  check(g, "priority badge colors differ for Low / Medium / High / Urgent (variant mapping drawn)", new Set(Object.values(fills)).size === 4, JSON.stringify(fills));
  const i1 = R(g, 1, 72), ws = W(g, 1), sg = ws.filter((x) => x.t === "Signature"), L = hrules(i1, 72, sg[0].y1, sg[0].y1 + 60, 50, 290, 150, 248), Rr = hrules(i1, 72, sg[1].y1, sg[1].y1 + 60, 300, 560, 150, 248);
  check(g, "signature lines drawn under 'Customer Signature' and 'Technician Signature' (one rule each, >= 150pt)", sg.length === 2 && L.length === 1 && Rr.length === 1, `left ${L.map(f1)}, right ${Rr.map(f1)}`);
  const gr = hrules(R(g, 1, 72), 72, 220, 500, 40, 560, 300);
  check(g, "parts + labor grid tables drawn (>= 5 full-width rules)", gr.length >= 5, `${gr.length} rules`);
  const many = { ...s, parts: Array.from({ length: 4 }, (_, i) => ({ partNumber: `P-${i}`, description: `Part ${i}`, qty: 1, unitPrice: 10 })) };
  await out("many-work", b, many);
  check(g, "more parts keep everything on the page flow (totals + signatures still present, footer on each page)", T("many-work").includes("Grand Total") && T("many-work").includes("Technician Signature") && footerOn("many-work"), `${pageCount(file("many-work"))} page(s)`);
  const cjk = { ...s, companyName: "快修專家服務", customer: { ...s.customer, name: "河濱公寓", address: "中山路二段 88 號" }, technician: "陳師傅", equipment: { ...s.equipment, description: "商用洗碗機" }, parts: [{ ...s.parts[0], description: "排水泵總成" }, ...s.parts.slice(1)], technicianNotes: "發現排水泵堵塞，已更換。" };
  await out("cjk-work", b, cjk);
  const ct = T("cjk-work"), cm = has(ct, ["快修專家服務", "河濱公寓", "中山路二段 88 號", "Technician: 陳師傅", "商用洗碗機", "排水泵總成", "發現排水泵堵塞，已更換。"]);
  check(g, "CJK company, customer, technician, equipment, part and notes render (Noto embedded)", !cm.length && /Noto/.test(fonts(file("cjk-work"))), cm.length ? `missing ${cm.join(", ")}` : "all present");
});

// ================= browser =================
let server, browser;
try {
  server = await createServer({ configFile: "vite.config.js", root: `${process.cwd()}/playground`, server: { port: 0, host: "127.0.0.1" }, logLevel: "error" });
  await server.listen();
  browser = await chromium.launch();
  const page = await browser.newPage(), errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => ["error", "warning"].includes(m.type()) && !/Failed to load resource/.test(m.text()) && errors.push(`${m.type()}: ${m.text()}`));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);
  await page.waitForFunction(() => window.__pdfwind?.renders.length >= 1, null, { timeout: 60000 });
  const listed = await page.locator("nav button").allTextContents();
  const want = ["Lesson plan", "Medical intake form", "Meeting minutes", "Packing slip", "Press release", "Shipping label", "Work order"];
  check("browser", "playground Blocks group lists the 7 new blocks (each uses its own exported render options)", want.every((t) => listed.includes(t)), want.filter((t) => !listed.includes(t)).join(", ") || `${want.length}/7 listed`);
  let same = 0; const diffs = [], sizes = [], ms = [];
  for (const nme of Object.keys(BL)) {
    const k = await page.evaluate(() => window.__pdfwind.renders.length);
    await page.evaluate((d) => window.__pdfwind.set({ demo: d }), nme);
    await page.waitForFunction((k) => window.__pdfwind.renders.length > k, k, { timeout: 60000 });
    writeFileSync(file(`browser-${nme}`), Buffer.from(await page.evaluate(() => window.__pdfwind.pdfBytes())));
    ms.push(await page.evaluate(() => window.__pdfwind.renders.at(-1).ms));
    const d = demos[nme], nodePdf = await renderPdf(d.component, {}, { ...(d.options ?? {}) });
    writeFileSync(file(`node-${nme}`), nodePdf);
    const a = norm(allText(file(`node-${nme}`)).join(" ")), c = norm(allText(file(`browser-${nme}`)).join(" "));
    if (a === c && pageCount(file(`node-${nme}`)) === pageCount(file(`browser-${nme}`))) same++; else diffs.push(`${nme} (pages ${pageCount(file(`node-${nme}`))}/${pageCount(file(`browser-${nme}`))})`);
    const [w, hh] = pageSize(file(`browser-${nme}`)), [rw, rh] = pageSize(`${REF}/${nme}.pdf`);
    if (!(near(w, rw, 0.6) && near(hh, rh, 0.6))) sizes.push(`${nme} ${f1(w)}x${f1(hh)} vs ${f1(rw)}x${f1(rh)}`);
  }
  check("browser", "Chromium renders all 7 blocks with text and page count identical to Node", same === 7, same === 7 ? `7/7 identical; render ms median ${[...ms].sort((x, y) => x - y)[3]}, max ${Math.max(...ms)}` : `differs: ${diffs.join(", ")}`);
  check("browser", "Chromium page sizes match the reference too (4x6in label, A4 elsewhere): the playground just uses the block's options", !sizes.length, sizes.join("; ") || "7/7 sizes match");
  check("browser", "Chromium label PDF QR decodes to the tracking number", await (async () => { const q = raster(file("browser-shipping-label"), 1, { dpi: 300 }), rgba = new Uint8ClampedArray(q.w * q.h * 4); for (let i = 0, o = 0; i < q.px.length; i += 3, o += 4) { rgba[o] = q.px[i]; rgba[o + 1] = q.px[i + 1]; rgba[o + 2] = q.px[i + 2]; rgba[o + 3] = 255; } const hit = jsQR(rgba, q.w, q.h); return hit && new TextDecoder().decode(Uint8Array.from(hit.binaryData)) === B.shippingLabelSample.trackingNumber; })(), B.shippingLabelSample.trackingNumber);
  check("browser", "no console errors or Vue warnings", errors.length === 0, errors.slice(0, 3).join(" | "));
} catch (e) { check("browser", "browser run", false, String(e?.stack ?? e).slice(0, 300)); }
finally { await browser?.close(); await server?.close(); await close(); }

const groups = [...new Set(rows.map((r) => r.group))];
const md = ["| # | group | check | result | detail |", "|---|---|---|---|---|", ...rows.map((r, i) => `| ${i + 1} | ${r.group} | ${r.name} | ${r.pass ? "PASS" : "FAIL"} | ${r.detail.replace(/\|/g, "\\|").replace(/\n/g, "<br>")} |`)].join("\n");
const total = `${rows.filter((r) => r.pass).length}/${rows.length} pass`;
const summary = groups.map((g) => `${g}: ${rows.filter((r) => r.group === g && r.pass).length}/${rows.filter((r) => r.group === g).length}`).join(" · ");
writeFileSync(`${OUT}/report.md`, `# Phase 3b-2 E2E\n\n${md}\n\n${total}\n\n${summary}\n`);
console.log(md + `\n\n${total}\n${summary}`);
process.exit(rows.every((r) => r.pass) ? 0 : 1);
