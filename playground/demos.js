// One demo document per component, covering every variant/size. Shared by the playground page and scripts/e2e-phase2a.mjs.
// Markers (STACK-A, CARD-MUTED ...) are what the E2E looks up in extracted text / bounding boxes.
import { h } from "vue";
import { Stack, Section, Card, Divider, KeepTogether, PageBreak, PageHeader, PageFooter, PageNumber, Watermark, Heading, Text, Link, List, Table, TableHeader, TableBody, TableFooter, TableRow, TableCell, DataTable, KeyValue, Graph, QRCode, Alert, Badge, Form, Signature, PdfImage } from "../src/index.js";
import { TEST_PNG, testPngBytes } from "./assets.js";
import { InvoiceClassic, InvoiceConsultant, InvoiceCorporate, InvoiceCreative, InvoiceMinimal, InvoiceModern, InvoiceFooter, InvoiceCreativeFooter, blockPage, invoiceClassicSample, invoiceConsultantSample, invoiceCorporateSample, invoiceCreativeSample, invoiceMinimalSample, invoiceModernSample, ReportFinancial, ReportMarketing, ReportOperations, ReportSecurity, EventAgenda, EventTicket, GiftCertificate, reportFinancialOptions, reportMarketingOptions, reportOperationsOptions, reportSecurityOptions, eventAgendaOptions, eventTicketOptions, giftCertificateOptions, reportFinancialSample, reportMarketingSample, reportOperationsSample, reportSecuritySample, eventAgendaSample, eventTicketSample, giftCertificateSample, LessonPlan, MedicalIntakeForm, MeetingMinutes, PackingSlip, PressRelease, ShippingLabel, WorkOrder, lessonPlanOptions, medicalIntakeFormOptions, meetingMinutesOptions, packingSlipOptions, pressReleaseOptions, shippingLabelOptions, workOrderOptions, lessonPlanSample, medicalIntakeFormSample, meetingMinutesSample, packingSlipSample, pressReleaseSample, shippingLabelSample, workOrderSample } from "../src/blocks/index.js";

const slot = (c) => (typeof c === "function" ? c : () => c);
const el = (C, props, content) => h(C, props, content === undefined ? undefined : { default: slot(content) });
const label = (t) => el(Text, { variant: "xs", color: "muted-foreground", noMargin: true, class: "mt-3 mb-1" }, t);
const box = (t, cls = "") => h("div", { class: `flex h-8 w-14 items-center justify-center bg-primary text-xs text-primary-foreground ${cls}` }, t);
const page = (...kids) => ({ render: () => h("div", kids.map((k) => (typeof k === "function" ? k() : k))) });
const lines = (n, prefix) => Array.from({ length: n }, (_, i) => el(Text, { noMargin: true, class: "py-1" }, `${prefix}-${i + 1}`));


const tbl = (variant, p) => el(Table, { variant }, [
  el(TableHeader, {}, el(TableRow, {}, [el(TableCell, {}, `${p}-H1`), el(TableCell, {}, `${p}-H2`), el(TableCell, { align: "right" }, `${p}-H3`)])),
  el(TableBody, {}, [1, 2, 3].map((r) => el(TableRow, {}, [el(TableCell, {}, `${p}-R${r}C1`), el(TableCell, {}, `${p}-R${r}C2`), el(TableCell, { align: "right" }, `${p}-R${r}C3`)]))),
  el(TableFooter, {}, el(TableRow, {}, [el(TableCell, {}, `${p}-F1`), el(TableCell, {}, ""), el(TableCell, { align: "right" }, `${p}-F3`)])),
]);
const dtCols = [{ key: "sku", header: "DT-SKU", width: 80 }, { key: "name", header: "DT-NAME" }, { key: "qty", header: "DT-QTY", align: "center", width: 64 }, { key: "amount", header: "DT-AMOUNT", align: "right", width: 100, render: (v) => h("span", { class: "font-bold text-success" }, `$${v}`), renderFooter: (v) => h("span", { class: "font-bold" }, `$${v}`) }];
const dtRows = [{ sku: "DT-A1", name: "DT-Widget", qty: 2, amount: "100.00" }, { sku: "DT-B2", name: "DT-Gadget", qty: 5, amount: "425.00" }, { sku: "DT-C3", name: "DT-Doohickey", qty: 1, amount: "250.00" }, { sku: "DT-D4", name: "DT-Gizmo", qty: 9, amount: "750.00" }];
const kvItems = [{ key: "KV-INVOICE Invoice no.", value: "KV-V1 INV-1042" }, { key: "KV-DATE Date", value: "KV-V2 2026-03-01" }, { key: "KV-DUE Due", value: "KV-V3 2026-03-31" }, { key: "KV-TOTAL Total", value: "KV-V4 $1,525.00" }];
const gData = [{ label: "Q1", value: 120 }, { label: "Q2", value: 180 }, { label: "Q3", value: 90 }, { label: "Q4", value: 210 }];
const gSeries = [{ name: "GR-S2025", data: [{ label: "Jan", value: 40 }, { label: "Feb", value: 65 }, { label: "Mar", value: 50 }, { label: "Apr", value: 90 }] }, { name: "GR-S2026", data: [{ label: "Jan", value: 55 }, { label: "Feb", value: 70 }, { label: "Mar", value: 95 }, { label: "Apr", value: 120 }] }];
const QR = { url: "https://pdfwind.dev/qr?ref=e2e&x=1", cjk: "第一個 QR 中文 ✓ pdfwind", long: "pdfwind-long-payload-".repeat(14) };
export { QR };

// blocks: the sample data is passed explicitly because the footer band receives the same props as the block
const blockDemo = (title, Comp, data, Footer = InvoiceFooter, extra = {}) => ({ title, group: "Blocks", ...extra, component: { render: () => h(Comp, { data }) }, options: { ...blockPage, footer: { render: () => h(Footer, { data }) } } });
// 3b blocks: each block exports its own recommended render options (page size, margins, footer band); the playground just uses them
const optsDemo = (title, Comp, data, o) => ({ title, group: "Blocks", component: { render: () => h(Comp, { data }) }, options: { ...o, ...(o.footer && { footer: { render: () => h(o.footer, { data }) } }) } });
const manyItems = (n) => Array.from({ length: n }, (_, i) => ({ description: `Line item ${i + 1}`, quantity: (i % 4) + 1, unitPrice: 100 + i * 7.5 }));

// one small instance of every component, for looking at a theme (Theme picker) and for the theme E2E contact sheet
const sampler = () => [
  h(Watermark, { text: "SAMPLE" }),
  h(PageHeader, { title: "Acme Corp", subtitle: "Theme sampler", rightText: "March 2026", rightSubText: "Every component", marginBottom: 10 }),
  el(Heading, { level: 1 }, "Heading one"), el(Heading, { level: 2 }, "Heading two"), el(Heading, { level: 3 }, "Heading three"),
  el(Heading, { level: 4 }, "Heading four"), el(Heading, { level: 5 }, "Heading five"), el(Heading, { level: 6 }, "Heading six"),
  el(Text, {}, ["Body text with a ", h(Link, { href: "https://example.com" }, { default: () => "link" }), ", numbers 0123456789 and CJK 繁體中文。"]),
  el(Text, { variant: "xs", color: "muted-foreground" }, "Muted caption text (muted-foreground)"),
  h(Divider),
  h(Stack, { direction: "horizontal", gap: "sm", wrap: true }, () => ["default", "primary", "success", "warning", "destructive", "info", "outline"].map((v) => h(Badge, { variant: v, label: v }))),
  ...["info", "success", "warning", "error"].map((v) => el(Alert, { variant: v, title: `${v} alert` }, "Alert body text.")),
  el(Card, { title: "Card title" }, "Card body text."), el(Card, { title: "Muted card", variant: "muted" }, "Card on the muted background."),
  el(Section, { variant: "callout" }, el(Text, { noMargin: true }, "Callout section")), el(Section, { variant: "highlight" }, el(Text, { noMargin: true }, "Highlight section")),
  h(List, { variant: "bullet", items: [{ text: "Bullet one" }, { text: "Bullet two" }] }), h(List, { variant: "checklist", items: [{ text: "Done", checked: true }, { text: "Open", checked: false }] }),
  h(KeyValue, { items: [{ key: "Invoice", value: "INV-1042" }, { key: "Total", value: "$1,525.00" }] }),
  h(PageBreak),
  h(Table, { variant: "grid", zebraStripe: true }, () => [el(TableHeader, {}, el(TableRow, {}, [el(TableCell, {}, "Item"), el(TableCell, { align: "right" }, "Amount")])), el(TableBody, {}, [["Design", "$900"], ["Build", "$2,400"], ["Review", "$300"]].map(([a, b]) => el(TableRow, {}, [el(TableCell, {}, a), el(TableCell, { align: "right" }, b)]))), el(TableFooter, {}, el(TableRow, {}, [el(TableCell, {}, "Total"), el(TableCell, { align: "right" }, "$3,600")]))]),
  h(DataTable, { variant: "grid", stripe: true, columns: [{ key: "sku", header: "SKU", width: 80 }, { key: "name", header: "Name" }, { key: "amount", header: "Amount", align: "right", width: 100 }], data: [{ sku: "A1", name: "Widget", amount: "$100" }, { sku: "B2", name: "Gadget", amount: "$425" }] }),
  h(Graph, { variant: "bar", title: "Bar chart", data: gData, height: 130, showValues: true }),
  h(Graph, { variant: "donut", title: "Donut chart", data: gData, height: 130 }),
  h("div", { class: "flex flex-row items-start gap-6" }, [h(QRCode, { value: "https://pdfwind.dev", size: 80, caption: "QR code" }), h(PdfImage, { src: TEST_PNG, variant: "thumbnail", caption: "Image" })]),
  h(Form, { title: "Form", groups: [{ title: "Applicant", layout: "two-column", fields: [{ label: "Full name" }, { label: "Email", hint: "hint" }] }] }),
  h(Signature, { variant: "double", signers: [{ label: "Authorized by", name: "Alex Kim", title: "CEO" }, { label: "Approved by", name: "Sam Patel", title: "CFO" }] }),
  h(PageFooter, { leftText: "Acme Corp", rightText: "acme.example", marginTop: 8 }), h(PageNumber, { format: "Page {page} of {total}" }),
];


// The README / first-screen showcase: a realistic two-page report built only from components and theme tokens (no E2E fixtures, no raw colors),
// so it follows whatever theme it is rendered with (default, vivid, dark, ...).
const showcaseFooter = { render: () => h(PageFooter, { leftText: "Northwind Analytics · Q3 customer report", marginTop: 0, style: { marginLeft: "42pt", marginRight: "42pt", marginBottom: "18pt" } }, { right: () => h(PageNumber, { format: "Page {page} of {total}", align: "right", size: "xs" }) }) };
const kpi = (value, label, trend, variant) => el(Card, { variant: "muted", class: "flex-1" }, [el(Text, { variant: "xs", color: "muted-foreground", noMargin: true }, label), el(Heading, { level: 2, noMargin: true, class: "mt-1" }, value), h(Badge, { variant, size: "sm", label: trend, class: "mt-2" })]);
const showcase = () => [
  h(PageHeader, { title: "Q3 customer report", subtitle: "Northwind Analytics · prepared for the leadership team", rightText: "September 2026", rightSubText: "Confidential", marginBottom: 14 }),
  el(Text, {}, "Customer growth stayed healthy through the third quarter: more teams adopted the platform, expansion revenue outpaced churn, and support load per account fell for the second quarter running."),
  el(Alert, { variant: "info", title: "Retention beat plan" }, "Net revenue retention reached 112% in Q3, four points ahead of plan, driven by seat expansion in mid-market accounts."),
  h("div", { class: "mt-3 flex flex-row gap-3" }, [kpi("$4.8M", "Annual recurring revenue", "+9.4% QoQ", "success"), kpi("112%", "Net revenue retention", "+4 pts vs plan", "success"), kpi("2.1%", "Logo churn", "-0.3 pts", "info")]),
  h(Graph, { variant: "bar", title: "New customers per month", subtitle: "July to December, all plans", data: [{ label: "Jul", value: 38 }, { label: "Aug", value: 44 }, { label: "Sep", value: 51 }, { label: "Oct", value: 47 }, { label: "Nov", value: 58 }, { label: "Dec", value: 63 }], height: 150, showValues: true, class: "mt-3" }),
  el(Heading, { level: 3 }, "What changed this quarter"),
  h(List, { variant: "bullet", items: [{ text: "Self-serve onboarding cut time to first report from 9 days to 3." }, { text: "The mid-market plan now includes audit exports; 31 accounts upgraded." }, { text: "Two enterprise renewals moved to multi-year terms." }] }),
  h(PageBreak),
  el(Heading, { level: 3 }, "Top accounts by ARR"),
  h(DataTable, { variant: "grid", stripe: true, columns: [{ key: "account", header: "Account" }, { key: "plan", header: "Plan", width: 90 }, { key: "arr", header: "ARR", align: "right", width: 90 }, { key: "status", header: "Status", width: 110, render: (v) => h(Badge, { variant: v === "Renewing" ? "info" : v === "At risk" ? "warning" : "success", size: "sm", label: v }) }], data: [{ account: "Globex Corporation", plan: "Enterprise", arr: "$610,000", status: "Healthy" }, { account: "Initech", plan: "Enterprise", arr: "$420,000", status: "Renewing" }, { account: "Umbrella Logistics", plan: "Mid-market", arr: "$188,000", status: "Healthy" }, { account: "Stark Industries", plan: "Mid-market", arr: "$164,500", status: "At risk" }, { account: "Wayne Foods", plan: "Mid-market", arr: "$131,000", status: "Healthy" }] }),
  h("div", { class: "mb-4 mt-4 flex flex-row items-start gap-4" }, [h(QRCode, { value: "https://northwind.example/dashboards/q3", size: 84, caption: "Live dashboard" }), h("div", { class: "flex-1" }, [el(Heading, { level: 4, noMargin: true }, "Where to look next"), el(Text, { variant: "xs", color: "muted-foreground" }, "Scan the code for the interactive version of this report, with account-level detail and the churn cohort breakdown.")])]),
  h(Form, { title: "Renewal approval", subtitle: "Complete before the Initech renewal call", groups: [{ layout: "two-column", fields: [{ label: "Account" }, { label: "Renewal date" }, { label: "Proposed ARR" }, { label: "Discount approved", hint: "percent" }] }] }),
  h(Signature, { variant: "double", signers: [{ label: "Prepared by", name: "Maya Chen", title: "Head of Customer Success", date: "September 30, 2026" }, { label: "Approved by", name: "Jonas Weber", title: "Chief Operating Officer" }] }),
];

export const demos = {
  showcase: { title: "Showcase: customer report", component: { render: () => h("div", showcase()) }, options: { size: "a4", margin: { top: 56, left: 56, right: 56, bottom: "auto" }, footer: showcaseFooter } },
  stack: { title: "Stack", component: page(
    label("gap none | sm | md | lg | xl (vertical)"),
    h("div", { class: "flex flex-row gap-10" }, ["none", "sm", "md", "lg", "xl"].map((g) => el(Stack, { gap: g }, [box(`GV-${g}-A`), box(`GV-${g}-B`)]))),
    label("horizontal, gap sm"), el(Stack, { direction: "horizontal", gap: "sm" }, [box("HA"), box("HB"), box("HC")]),
    label("horizontal, justify between"), el(Stack, { direction: "horizontal", justify: "between" }, [box("JB-1"), box("JB-2")]),
    label("horizontal, justify center"), el(Stack, { direction: "horizontal", justify: "center" }, [box("JC-1"), box("JC-2")]),
    label("horizontal, justify end"), el(Stack, { direction: "horizontal", justify: "end" }, [box("JE-1")]),
    label("vertical, align center"), el(Stack, { align: "center", gap: "sm" }, [box("AC-1"), box("AC-2")]),
    label("vertical, align end"), el(Stack, { align: "end", gap: "sm" }, [box("AE-1")]),
    label("wrap"), el(Stack, { direction: "horizontal", wrap: true, gap: "sm", class: "w-48" }, ["W1", "W2", "W3", "W4", "W5"].map((t) => box(t))),
    label("class passthrough: class=bg-[#ff00ff]"), el(Stack, { class: "bg-[#ff00ff] p-2", gap: "none" }, el(Text, { noMargin: true }, "PASS-STACK")),
  ) },

  section: { title: "Section", component: page(
    ...["none", "sm", "md", "lg", "xl"].flatMap((s) => [el(Text, { noMargin: true, class: "text-xs" }, `SP-${s}-ABOVE`), el(Section, { spacing: s, class: "h-1 bg-border" }), el(Text, { noMargin: true, class: "text-xs" }, `SP-${s}-BELOW`)]),
    el(Section, { variant: "callout", spacing: "sm" }, el(Text, { noMargin: true }, "SEC-CALLOUT body")),
    el(Section, { variant: "callout", spacing: "sm", accentColor: "info" }, el(Text, { noMargin: true }, "SEC-CALLOUT-INFO accentColor=info")),
    el(Section, { variant: "highlight", spacing: "sm" }, el(Text, { noMargin: true }, "SEC-HIGHLIGHT body (bg-muted)")),
    el(Section, { variant: "highlight", spacing: "sm", accentColor: "#ff6600" }, el(Text, { noMargin: true }, "SEC-HIGHLIGHT-ORANGE accentColor=#ff6600")),
    el(Section, { variant: "card", spacing: "sm" }, el(Text, { noMargin: true }, "SEC-CARD body")),
    el(Section, { border: true, spacing: "sm", padding: "md" }, el(Text, { noMargin: true }, "SEC-BORDER border + padding md")),
    el(Section, { background: "#ffedd5", padding: "lg", spacing: "sm" }, el(Text, { noMargin: true }, "SEC-BG background=#ffedd5 padding lg")),
    el(Section, { background: "success", padding: "sm", spacing: "sm" }, el(Text, { noMargin: true, color: "primary-foreground" }, "SEC-BG-TOKEN background=success")),
    el(Section, { padding: "none", border: true, spacing: "sm" }, el(Text, { noMargin: true }, "SEC-PAD-NONE")),
    el(Section, { padding: "sm", border: true, spacing: "sm" }, el(Text, { noMargin: true }, "SEC-PAD-SM")),
    el(Section, { padding: "lg", border: true, spacing: "sm" }, el(Text, { noMargin: true }, "SEC-PAD-LG")),
    el(Section, { class: "bg-[#ff00ff] p-2", spacing: "sm" }, el(Text, { noMargin: true }, "PASS-SECTION")),
  ) },

  card: { title: "Card", component: page(
    el(Card, { title: "CARD-DEFAULT title" }, "Card body text, default variant."),
    el(Card, { title: "CARD-BORDERED title", variant: "bordered" }, "Bordered: 2pt border."),
    el(Card, { title: "CARD-MUTED title", variant: "muted" }, "Muted: bg-muted."),
    el(Card, { variant: "muted", padding: "sm" }, "CARD-PAD-SM no title"),
    el(Card, { variant: "muted", padding: "lg" }, "CARD-PAD-LG no title"),
    el(Card, { class: "bg-[#ff00ff]" }, "PASS-CARD"),
    el(Card, { class: "p-1", variant: "muted" }, "CARD-OVERRIDE-P1 (class p-1 must beat default p-3)"),
  ) },

  "card-wrap": { title: "Card (wrap vs no wrap)", component: page(
    // the spacer leaves ~220pt on page 1: too little for either card, so the no-wrap card must jump to page 2 whole,
    // and the wrap card (starting mid page 2) must split across pages 2 and 3
    h("div", { class: "h-[560pt]" }),
    el(Card, { title: "CARD-NOWRAP-TITLE" }, lines(16, "CARD-NOWRAP-LINE")),
    el(Card, { title: "CARD-WRAP-TITLE", wrap: true }, lines(16, "CARD-WRAP-LINE")),
  ) },

  divider: { title: "Divider", component: page(
    label("spacing none / sm / md / lg"),
    ...["none", "sm", "md", "lg"].flatMap((s) => [el(Text, { noMargin: true, class: "text-xs" }, `DSP-${s}-A`), el(Divider, { spacing: s }), el(Text, { noMargin: true, class: "text-xs" }, `DSP-${s}-B`)]),
    ...["solid", "dashed", "dotted"].flatMap((v) => ["thin", "medium", "thick"].flatMap((t) => [label(`DIV-${v}-${t}`), el(Divider, { variant: v, thickness: t, spacing: "sm", color: "primary" })])),
    label("label"), el(Divider, { label: "DIV-LABEL-TEXT", spacing: "sm" }),
    label("label dashed + color"), el(Divider, { label: "DIV-LABEL-DASHED", variant: "dashed", color: "destructive", spacing: "sm" }),
    label("width 120px"), el(Divider, { width: 120, color: "success", spacing: "sm", thickness: "medium" }),
    label("class passthrough"), el(Divider, { class: "bg-[#ff00ff] h-3", spacing: "sm" }),
  ) },

  "keep-together": { title: "KeepTogether", component: page(
    h("div", { class: "h-[600pt]" }), // ~180pt left on page 1; the 12-line block needs more
    el(KeepTogether, { class: "border border-border p-2" }, lines(12, "KT-BLOCK")),
    el(KeepTogether, { class: "bg-[#ff00ff]" }, el(Text, { noMargin: true }, "PASS-KEEP")),
    label("control: the same block without KeepTogether splits"), h("div", { class: "h-[220pt]" }), h("div", { class: "border border-border p-2" }, lines(12, "KT-LOOSE")),
  ) },

  "page-break": { title: "PageBreak", component: page(
    el(Text, {}, "PB-PAGE-1 content"), h(PageBreak), el(Text, {}, "PB-PAGE-2 content"), h(PageBreak), el(Text, {}, "PB-PAGE-3 content"),
    h(PageBreak, { class: "h-0" }), el(Text, {}, "PB-PAGE-4 content (after PageBreak with class)"),
  ) },

  "page-header": { title: "PageHeader", component: page(
    el(PageHeader, { title: "PH-SIMPLE Acme Corp", subtitle: "PH-SIMPLE-SUB Invoice #1042", rightText: "PH-SIMPLE-RIGHT March 2026", rightSubText: "PH-SIMPLE-RSUB Due in 30 days", marginBottom: 14 }),
    el(PageHeader, { variant: "centered", title: "PH-CENTERED Quarterly Report", subtitle: "PH-CENTERED-SUB Prepared for the board", marginBottom: 14 }),
    el(PageHeader, { variant: "minimal", title: "PH-MINIMAL Meeting Notes", subtitle: "PH-MINIMAL-SUB Weekly sync", rightText: "PH-MINIMAL-RIGHT 12 Mar", rightSubText: "PH-MINIMAL-RSUB Room 4", marginBottom: 14 }),
    el(PageHeader, { variant: "branded", title: "PH-BRANDED Welcome Packet", subtitle: "PH-BRANDED-SUB New hire onboarding", marginBottom: 14 }),
    h(PageHeader, { variant: "branded", title: "PH-BRANDED-BG custom background", background: "#0369a1", marginBottom: 14 }),
    h(PageHeader, { variant: "logo-left", title: "PH-LOGOLEFT Northwind", subtitle: "PH-LOGOLEFT-SUB Trading Co.", rightText: "PH-LOGOLEFT-RIGHT INV-77", marginBottom: 14 }, { logo: () => h("div", { class: "size-full bg-[#ff6600]" }) }),
    h(PageHeader, { variant: "logo-right", title: "PH-LOGORIGHT Contoso", subtitle: "PH-LOGORIGHT-SUB Legal", marginBottom: 14 }, { logo: () => h("div", { class: "size-full bg-[#00aa55]" }) }),
    el(PageHeader, { variant: "two-column", title: "PH-TWOCOL Fabrikam", subtitle: "PH-TWOCOL-SUB Finance dept.", address: "PH-ADDR 1 Main St", phone: "PH-PHONE +1 555 0100", email: "PH-EMAIL hi@fabrikam.test", marginBottom: 14 }),
    el(PageHeader, { title: "PH-TITLECOLOR titleColor=destructive", titleColor: "destructive", marginBottom: 14 }),
    el(PageHeader, { title: "PH-MB-NONE marginBottom=0", marginBottom: 0 }), el(Text, { noMargin: true }, "PH-AFTER-MB-NONE"),
    el(PageHeader, { title: "PH-PASS class passthrough", class: "bg-[#ff00ff]", marginBottom: 14 }),
  ) },

  "page-header-fixed": { title: "PageHeader (fixed, 3 pages)", component: page(
    el(PageHeader, { title: "PHF-REPEAT fixed header", fixed: true, marginBottom: 0 }),
    el(Text, { class: "mt-16" }, "PHF-PAGE-1"), h(PageBreak), el(Text, { class: "mt-16" }, "PHF-PAGE-2"), h(PageBreak), el(Text, { class: "mt-16" }, "PHF-PAGE-3"),
  ) },

  "page-footer": { title: "PageFooter", component: page(
    el(PageFooter, { leftText: "PF-SIMPLE-L left", centerText: "PF-SIMPLE-C center", rightText: "PF-SIMPLE-R right", marginTop: 6 }),
    h(PageFooter, { variant: "simple", marginTop: 14, pagePadding: 20 }, { left: () => "PF-SLOT-L", right: () => h(PageNumber, { format: "Page {page} of {total}", align: "right", muted: true }) }),
    el(PageFooter, { variant: "centered", leftText: "PF-CENTERED-1 Acme Corp", rightText: "PF-CENTERED-2 acme.test", marginTop: 14 }),
    el(PageFooter, { variant: "branded", leftText: "PF-BRANDED-L Acme", rightText: "PF-BRANDED-R 2026", marginTop: 14 }),
    el(PageFooter, { variant: "branded", leftText: "PF-BRANDED-BG", rightText: "custom", background: "#0369a1", textColor: "#ffff00", marginTop: 14 }),
    el(PageFooter, { variant: "minimal", leftText: "PF-MINIMAL-L left", rightText: "PF-MINIMAL-R right", marginTop: 14 }),
    el(PageFooter, { variant: "three-column", leftText: "PF-3COL-L Acme", address: "PF-3COL-ADDR 1 Main St", phone: "PF-3COL-PHONE 555 0100", email: "PF-3COL-EMAIL a@b.test", website: "PF-3COL-WEB acme.test", rightText: "PF-3COL-R Page 1", marginTop: 14 }),
    el(PageFooter, { variant: "detailed", leftText: "PF-DETAIL-L Acme Corp", address: "PF-DETAIL-ADDR 1 Main St", phone: "555 0100", email: "a@b.test", website: "acme.test", rightText: "PF-DETAIL-R Page 1 of 1", marginTop: 14 }),
    el(PageFooter, { leftText: "PF-PASS class passthrough", class: "bg-[#ff00ff]", marginTop: 14 }),
    h("div", { class: "relative mt-4 h-[150pt] border border-border" }, [el(Text, { noMargin: true, class: "p-2" }, "PF-STICKY-HOST"), el(PageFooter, { leftText: "PF-STICKY pinned to the host bottom", sticky: true, class: "px-2" })]),
  ) },

  "page-footer-fixed": { title: "PageFooter (fixed, 3 pages)", component: page(
    el(PageFooter, { leftText: "PFF-REPEAT fixed footer", fixed: true }),
    el(Text, {}, "PFF-PAGE-1"), h(PageBreak), el(Text, {}, "PFF-PAGE-2"), h(PageBreak), el(Text, {}, "PFF-PAGE-3"),
  ) },

  "page-number": { title: "PageNumber", component: page(
    label("default format"), h(PageNumber),
    label("format {page} / {total}"), h(PageNumber, { format: "PN-SLASH {page} / {total}" }),
    label("CJK format"), h(PageNumber, { format: "第 {page} 頁，共 {total} 頁" }),
    label("align left | center | right"), h(PageNumber, { align: "left", format: "PN-LEFT {page}" }), h(PageNumber, { align: "center", format: "PN-CENTER {page}" }), h(PageNumber, { align: "right", format: "PN-RIGHT {page}" }),
    label("size xs | sm | md"), h(PageNumber, { size: "xs", format: "PN-XS {page}" }), h(PageNumber, { size: "sm", format: "PN-SM {page}" }), h(PageNumber, { size: "md", format: "PN-MD {page}" }),
    label("muted false"), h(PageNumber, { muted: false, format: "PN-NOTMUTED {page}" }),
    label("class passthrough"), h(PageNumber, { class: "bg-[#ff00ff]", format: "PN-PASS {page}" }),
    h(PageBreak), el(Text, {}, "PN-PAGE-2"), h(PageNumber, { format: "PN-P2 {page} of {total}" }), h(PageBreak), el(Text, {}, "PN-PAGE-3"), h(PageNumber, { format: "PN-P3 {page} of {total}" }),
  ), options: { footer: { render: () => h(PageNumber, { format: "PN-FOOTER Page {page} of {total}", align: "right", class: "px-10" }) } } },

  watermark: { title: "Watermark", component: page(
    h(Watermark, { text: "DRAFT" }),
    el(Heading, {}, "WM-PAGE-1 Draft Document"), el(Text, {}, "WM-BODY text stays readable above the watermark."),
    h(PageBreak), el(Text, {}, "WM-PAGE-2"), h(PageBreak), el(Text, {}, "WM-PAGE-3"),
  ) },

  "watermark-variants": { title: "Watermark (positions, options)", component: page(
    h(Watermark, { text: "TL", position: "top-left", color: "success", fontSize: 40, angle: 0, opacity: 0.6 }),
    h(Watermark, { text: "TR", position: "top-right", color: "destructive", fontSize: 40, angle: 0, opacity: 0.6 }),
    h(Watermark, { text: "BL", position: "bottom-left", color: "info", fontSize: 40, angle: 0, opacity: 0.6 }),
    h(Watermark, { text: "BR", position: "bottom-right", color: "warning", fontSize: 40, angle: 0, opacity: 0.6 }),
    h(Watermark, { text: "CONFIDENTIAL", color: "#ff00ff", opacity: 0.3, fontSize: 50, angle: -30, class: "pt-0" }),
    el(Text, {}, "WMV-BODY"),
  ) },

  heading: { title: "Heading", component: page(
    ...[1, 2, 3, 4, 5, 6].map((l) => el(Heading, { level: l }, `HD-LEVEL-${l}`)),
    label("weights"), ...["normal", "medium", "semibold", "bold"].map((w) => el(Heading, { level: 4, weight: w, noMargin: true }, "HD-WEIGHT-SAMPLE")),
    label("tracking"), ...["tighter", "tight", "normal", "wide", "wider"].map((t) => el(Heading, { level: 5, tracking: t, noMargin: true }, "HD-TRACK-SAMPLE")),
    label("transform"), el(Heading, { level: 5, transform: "uppercase", noMargin: true }, "hd-transform upper"), el(Heading, { level: 5, transform: "lowercase", noMargin: true }, "HD-TRANSFORM LOWER"), el(Heading, { level: 5, transform: "capitalize", noMargin: true }, "hd-transform capitalize me"),
    label("align + color"), el(Heading, { level: 4, align: "center", noMargin: true }, "HD-ALIGN-CENTER"), el(Heading, { level: 4, align: "right", noMargin: true }, "HD-ALIGN-RIGHT"),
    el(Heading, { level: 4, color: "destructive", noMargin: true }, "HD-COLOR-TOKEN"), el(Heading, { level: 4, color: "#ff00ff", noMargin: true }, "HD-COLOR-RAW"),
    label("class passthrough: text-h1 text-primary must both apply"), el(Heading, { level: 6, class: "text-h1 text-[#ff00ff]", noMargin: true }, "HD-PASS"),
    label("CJK"), el(Heading, { level: 3, noMargin: true }, "HD-CJK 標題 繁體中文"),
  ) },

  text: { title: "Text", component: page(
    ...["xs", "sm", undefined, "base", "lg", "xl", "2xl", "3xl"].map((v) => el(Text, { variant: v, noMargin: true }, `TX-SIZE-${v ?? "default"}`)),
    label("weights"), ...["normal", "medium", "semibold", "bold"].map((w) => el(Text, { weight: w, noMargin: true }, "TX-WEIGHT-SAMPLE")),
    label("italic / decoration"), el(Text, { italic: true, noMargin: true }, "TX-ITALIC slanted"), el(Text, { decoration: "underline", noMargin: true }, "TX-UNDERLINE"), el(Text, { decoration: "line-through", noMargin: true }, "TX-LINETHROUGH"),
    label("transform"), el(Text, { transform: "uppercase", noMargin: true }, "tx-upper"), el(Text, { transform: "lowercase", noMargin: true }, "TX-LOWER"), el(Text, { transform: "capitalize", noMargin: true }, "tx-capitalize me"),
    label("align"), ...["left", "center", "right"].map((a) => el(Text, { align: a, noMargin: true }, `TX-ALIGN-${a}`)),
    el(Text, { align: "justify", noMargin: true }, "TX-JUSTIFY " + "justified words fill the line to both edges of the column. ".repeat(4)),
    label("color"), el(Text, { color: "primary", noMargin: true }, "TX-COLOR-PRIMARY"), el(Text, { color: "success", noMargin: true }, "TX-COLOR-SUCCESS"), el(Text, { color: "#ff00ff", noMargin: true }, "TX-COLOR-RAW"),
    label("margins: default vs noMargin"), el(Text, {}, "TX-MARGIN-A"), el(Text, {}, "TX-MARGIN-B"), el(Text, { noMargin: true }, "TX-NOMARGIN-A"), el(Text, { noMargin: true }, "TX-NOMARGIN-B"),
    label("CJK + mixed"), el(Text, {}, "TX-CJK 繁體中文測試 mixed with Latin."),
    label("class passthrough: text-primary + text-xl"), el(Text, { class: "text-[#ff00ff] text-xl", noMargin: true }, "TX-PASS"),
  ) },

  link: { title: "Link", component: page(
    // a Link is inline text; inside a flex column (Section, Stack) each one is its own block, as in pdfcn's demo
    el(Section, { spacing: "none" }, [
      el(Link, { href: "https://example.com/default" }, "LK-DEFAULT link"),
      el(Link, { href: "https://example.com/muted", variant: "muted" }, "LK-MUTED link"),
      el(Link, { href: "https://example.com/primary", variant: "primary" }, "LK-PRIMARY link"),
      el(Link, { href: "https://example.com/nounderline", underline: "none" }, "LK-NOUNDERLINE link"),
      el(Link, { href: "https://example.com/center", align: "center" }, "LK-CENTER link"),
      el(Link, { href: "https://example.com/right", align: "right" }, "LK-RIGHT link"),
      el(Link, { href: "https://example.com/color", color: "#ff00ff" }, "LK-COLOR link"),
      el(Link, { href: "https://example.com/pass", class: "text-[#00aaff] font-bold" }, "LK-PASS link"),
    ]),
    el(Text, {}, ["LK-INLINE see ", el(Link, { href: "https://example.com/inline" }, "inline link"), " in a sentence."]),
  ) },

  list: { title: "List", component: page(
    ...[["bullet", "LS-BULLET"], ["numbered", "LS-NUM"], ["checklist", "LS-CHECK"], ["icon", "LS-ICON"], ["multi-level", "LS-MULTI"], ["descriptive", "LS-DESC"]].flatMap(([variant, p]) => [
      label(variant),
      h(List, { variant, items: [
        { text: `${p}-1 first item`, description: `${p}-1-desc supporting detail`, checked: true, children: [{ text: `${p}-1a nested item`, children: [{ text: `${p}-1a-i deeper` }] }, { text: `${p}-1b nested` }] },
        { text: `${p}-2 second item`, description: `${p}-2-desc more detail`, checked: false },
        { text: `${p}-3 third item that is long enough to wrap onto a second line so that the hanging indent and marker alignment can be checked properly`, description: `${p}-3-desc`, checked: true },
      ] }),
    ]),
    label("gap xs | sm | md"), ...["xs", "sm", "md"].map((g) => h(List, { gap: g, items: [{ text: `LS-GAP-${g}-A` }, { text: `LS-GAP-${g}-B` }, { text: `LS-GAP-${g}-C` }] })),
    label("class passthrough"), h(List, { class: "bg-[#ff00ff]", items: [{ text: "LS-PASS" }] }),
  ) },

  "list-nowrap": { title: "List (noWrap)", component: page(
    // control first: ~140pt left on page 1, the 10 item list needs ~250pt, so it splits
    h("div", { class: "h-[640pt]" }), h(List, { items: Array.from({ length: 10 }, (_, i) => ({ text: `LSN-LOOSE-${i + 1}` })) }),
    h(PageBreak), h("div", { class: "h-[640pt]" }), h(List, { noWrap: true, items: Array.from({ length: 10 }, (_, i) => ({ text: `LSN-NOWRAP-${i + 1}` })) }),
  ) },

  // ---------------- phase 2b ----------------
  table: { title: "Table", component: page(
    ...["line", "grid", "minimal", "striped", "compact", "bordered", "primary-header"].flatMap((v) => [label(`variant ${v}`), tbl(v, `TB-${v}`)]),
    label("zebraStripe on line + widths + align"), el(Table, { variant: "line", zebraStripe: true }, [
      el(TableHeader, {}, el(TableRow, {}, [el(TableCell, { width: 80 }, "TBW-ID"), el(TableCell, {}, "TBW-NAME"), el(TableCell, { align: "right", width: 110 }, "TBW-AMOUNT")])),
      el(TableBody, {}, ["A", "B", "C", "D"].map((k) => el(TableRow, {}, [el(TableCell, { width: 80 }, `TBW-${k}1`), el(TableCell, {}, `TBW-${k}2`), el(TableCell, { align: "right", width: 110 }, `TBW-${k}3`)]))),
    ]),
    label("class passthrough"), el(Table, { class: "bg-[#ff00ff]" }, el(TableBody, {}, el(TableRow, {}, el(TableCell, {}, "PASS-TABLE")))),
  ) },

  "table-long": { title: "Table (120 rows)", component: page(
    el(Heading, { level: 3 }, "TBL-LONG 120 rows"),
    el(Table, { variant: "grid" }, [
      el(TableHeader, {}, el(TableRow, {}, [el(TableCell, { width: 90 }, "TBLSKU"), el(TableCell, {}, "TBLNAME"), el(TableCell, { align: "right", width: 90 }, "TBLAMOUNT")])),
      el(TableBody, {}, Array.from({ length: 120 }, (_, i) => el(TableRow, {}, [el(TableCell, { width: 90 }, `R${i + 1}-SKU`), el(TableCell, {}, i % 7 === 3 ? `R${i + 1}-NAME wraps onto several lines because this description is deliberately long enough to need more than one line in the middle column of the table` : `R${i + 1}-NAME`), el(TableCell, { align: "right", width: 90 }, `${(i * 12.5).toFixed(2)}`)]))),
      el(TableFooter, {}, el(TableRow, {}, [el(TableCell, { width: 90 }, "TBLTOTAL"), el(TableCell, {}, ""), el(TableCell, { align: "right", width: 90 }, "9999.00")])),
    ]),
    el(Text, {}, "TBL-AFTER paragraph after the table"),
  ) },

  "data-table": { title: "DataTable", component: page(
    label("grid (default), footer, custom render + slot"),
    h(DataTable, { columns: dtCols, data: dtRows.slice(0, 4), footer: { sku: "DT-TOTAL", amount: "1,525.00" } }, { "cell-name": ({ value }) => `${value} (slot)` }),
    label("striped + compact, line variant"), h(DataTable, { variant: "line", stripe: true, size: "compact", columns: dtCols.slice(0, 3), data: dtRows.slice(0, 4) }),
    label("primary-header, no footer"), h(DataTable, { variant: "primary-header", columns: dtCols.slice(0, 3), data: dtRows.slice(0, 3) }),
    label("empty value / numbers"), h(DataTable, { variant: "bordered", columns: [{ key: "a", header: "DTE-A" }, { key: "b", header: "DTE-B", align: "right" }], data: [{ a: "DTE-x", b: 0 }, { a: null, b: 1.5 }, { a: "DTE-z" }] }),
    label("class passthrough"), h(DataTable, { class: "bg-[#ff00ff]", columns: [{ key: "a", header: "PASS-DT" }], data: [{ a: "v" }] }),
  ) },

  "data-table-long": { title: "DataTable (150 rows)", component: page(
    h(DataTable, { variant: "striped", columns: dtCols.map((c) => (c.key === "sku" ? { ...c, header: "DTSKU" } : c)), data: Array.from({ length: 150 }, (_, i) => ({ sku: `D${i + 1}-SKU`, name: i % 9 === 4 ? `D${i + 1}-NAME with a much longer description that wraps to a second line inside its cell` : `D${i + 1}-NAME`, qty: i + 1, amount: (i * 3.25).toFixed(2) })), footer: { sku: "DTLTOTAL", amount: "999.00" } }),
    el(Text, {}, "DTL-AFTER"),
  ) },

  "key-value": { title: "KeyValue", component: page(
    label("horizontal (default)"), h(KeyValue, { items: kvItems }),
    label("divided, labelFlex 2, boldValue"), h(KeyValue, { items: kvItems, divided: true, labelFlex: 2, boldValue: true }),
    label("vertical + divided, size lg"), h(KeyValue, { items: kvItems.slice(0, 3), direction: "vertical", divided: true, size: "lg" }),
    label("size sm, colors, divider options"), h(KeyValue, { items: kvItems.slice(0, 3), size: "sm", labelColor: "info", valueColor: "success", divided: true, dividerColor: "destructive", dividerThickness: 1, dividerMargin: 4 }),
    label("per-item valueColor / styles"), h(KeyValue, { items: [{ key: "KV-ITEM-RED", value: "red", valueColor: "#ff0000" }, { key: "KV-ITEM-STYLE", value: "big", valueStyle: { fontSize: "18pt" } }] }),
    label("labelFlex 1 vs 4 with a long value"),
    ...[1, 4].map((f) => h(KeyValue, { labelFlex: f, items: [{ key: `KV-LF${f}`, value: `KV-LONGVAL${f} ` + "words that wrap inside the value column ".repeat(4) }] })),
    label("class passthrough"), h(KeyValue, { class: "bg-[#ff00ff]", items: [{ key: "KV-PASS", value: "v" }] }),
  ) },

  graph: { title: "Graph", component: page(
    h(Graph, { variant: "bar", title: "GR-BAR single series", subtitle: "GR-BAR-SUB revenue by quarter", data: gData, height: 170, showValues: true, xLabel: "GR-XLABEL", yLabel: "GR-YLABEL" }),
    h(Graph, { variant: "bar", title: "GR-BAR2 multi series", data: gSeries, height: 170 }),
    h(Graph, { variant: "horizontal-bar", title: "GR-HBAR", data: gData, height: 150, showValues: true }),
    h(Graph, { variant: "line", title: "GR-LINE", data: gSeries, height: 170, showValues: true }),
  ) },
  "graph-2": { title: "Graph (area, pie, donut)", component: page(
    h(Graph, { variant: "area", title: "GR-AREA smooth", data: gSeries, height: 160, smooth: true, showDots: false }),
    h("div", { class: "flex flex-row gap-4" }, [
      h(Graph, { variant: "pie", title: "GR-PIE", data: gData, width: 230, height: 170, legend: "none" }),
      h(Graph, { variant: "donut", title: "GR-DONUT", data: gData, width: 230, height: 170, centerLabel: "GR-CENTER", legend: "none" }),
    ]),
    h(Graph, { variant: "pie", title: "GR-PIE-LEGEND right", data: gData, width: 380, height: 160, legend: "right", colors: ["#e11d48", "#2563eb", "#16a34a", "#f59e0b"] }),
    h(Graph, { variant: "bar", title: "GR-FULLWIDTH", data: gData, fullWidth: true, height: 120, showGrid: false }),
    h(Graph, { variant: "line", class: "bg-[#ff00ff]", data: [{ label: "p", value: 1 }, { label: "q", value: 2 }], width: 120, height: 60, title: "PASS-GRAPH" }),
  ) },

  qrcode: { title: "QRCode", component: page(
    h("div", { class: "flex flex-row flex-wrap gap-6" }, [
      h(QRCode, { value: QR.url, caption: "QR-DEFAULT default" }),
      h(QRCode, { value: QR.url, size: 160, caption: "QR-LARGE size 160" }),
      h(QRCode, { value: QR.cjk, size: 140, errorLevel: "H", caption: "QR-CJK level H" }),
      h(QRCode, { value: QR.url, size: 120, errorLevel: "L", margin: 4, caption: "QR-L level L margin 4" }),
      h(QRCode, { value: QR.url, size: 120, errorLevel: "Q", caption: "QR-Q level Q" }),
      h(QRCode, { value: QR.url, size: 120, color: "primary", backgroundColor: "muted", caption: "QR-TOKENS tokens" }),
      h(QRCode, { value: QR.url, size: 120, color: "#1d4ed8", backgroundColor: "transparent", caption: "QR-BLUE blue, transparent" }),
      h(QRCode, { value: QR.long, size: 200, caption: "QR-LONG 300 chars" }),
      h(QRCode, { value: "PASS-QR", class: "bg-[#ff00ff] p-2", size: 60 }),
    ]),
  ) },

  alert: { title: "Alert", component: page(
    ...["info", "success", "warning", "error"].map((v) => el(Alert, { variant: v, title: `AL-${v.toUpperCase()} title` }, `AL-${v.toUpperCase()}-BODY message text for the ${v} variant.`)),
    el(Alert, { variant: "info", showIcon: false, title: "AL-NOICON title" }, "AL-NOICON-BODY"),
    el(Alert, { variant: "warning", showBorder: false, title: "AL-NOBORDER title" }, "AL-NOBORDER-BODY"),
    el(Alert, { variant: "success" }, "AL-BODYONLY no title"),
    el(Alert, { title: "AL-TITLEONLY" }),
    h(Alert, { variant: "info" }), // renders nothing
    el(Text, {}, "AL-AFTER-EMPTY"),
    el(Alert, { class: "bg-[#ff00ff]", title: "PASS-ALERT" }, "body"),
  ) },

  badge: { title: "Badge", component: page(
    ...["default", "primary", "success", "warning", "destructive", "info", "outline"].map((v) => h("div", { class: "mb-2 flex flex-row items-center gap-3" }, ["sm", "md", "lg"].map((s) => h(Badge, { variant: v, size: s, label: `BG-${v}-${s}` })))),
    label("label wins over slot; slot text; custom colors"),
    h("div", { class: "flex flex-row gap-3" }, [h(Badge, { label: "BG-LABEL" }, { default: () => "BG-SLOT-IGNORED" }), el(Badge, {}, "BG-SLOT"), h(Badge, { label: "BG-CUSTOM", background: "#ffedd5", color: "#9a3412" }), h(Badge, { label: "BG-TOKENS", background: "info", color: "primary-foreground" })]),
    label("inline in a sentence"), el(Text, {}, ["Status: ", h(Badge, { variant: "success", label: "BG-INLINE" }), " and more text."]),
    label("class passthrough"), h(Badge, { label: "PASS-BADGE", class: "bg-[#ff00ff]" }),
  ) },

  form: { title: "Form", component: page(
    h(Form, { title: "FM-TITLE Application", subtitle: "FM-SUB please print clearly", groups: [
      { title: "FM-G1 Applicant", fields: [{ label: "FM-NAME Full name", hint: "FM-HINT as on passport" }, { label: "FM-EMAIL Email" }, { label: "FM-NOTES Notes", height: 60 }] },
      { title: "FM-G2 Two columns", layout: "two-column", fields: [{ label: "FM-C1" }, { label: "FM-C2" }, { label: "FM-C3" }, { label: "FM-C4" }] },
      { title: "FM-G3 Three columns", layout: "three-column", fields: [{ label: "FM-D1" }, { label: "FM-D2" }, { label: "FM-D3" }] },
    ] }),
    ...["box", "outlined", "ghost"].map((v) => h(Form, { variant: v, groups: [{ title: `FM-V-${v}`, fields: [{ label: `FM-${v}-A`, hint: "hint" }, { label: `FM-${v}-B` }] }] })),
    h(Form, { labelPosition: "left", groups: [{ title: "FM-LEFT", fields: [{ label: "FM-LEFT-A" }, { label: "FM-LEFT-B", height: 30 }] }] }),
    h(Form, { class: "bg-[#ff00ff]", groups: [{ fields: [{ label: "PASS-FORM" }] }] }),
  ) },

  signature: { title: "Signature", component: page(
    el(Text, {}, "SG-ABOVE"),
    h(Signature, { label: "SG-SINGLE Signature", name: "SG-NAME Jane Doe", title: "SG-TITLE CFO", date: "SG-DATE 2026-03-01" }),
    h(Signature, { variant: "double", signers: [{ label: "SG-D1 Authorized by", name: "SG-D1-NAME Alex", title: "SG-D1-TITLE CEO", date: "SG-D1-DATE" }, { label: "SG-D2 Approved by", name: "SG-D2-NAME Sam", title: "SG-D2-TITLE CFO" }] }),
    h(Signature, { variant: "double" }),
    h(Signature, { variant: "inline", label: "SG-INLINE Signed", name: "SG-INLINE-NAME Jane" }),
    h(Signature, { class: "bg-[#ff00ff]", label: "PASS-SIG" }),
  ) },

  "pdf-image": { title: "PdfImage", component: page(
    label("variants (data URI)"),
    h("div", { class: "flex flex-row flex-wrap items-start gap-4" }, [
      h(PdfImage, { src: TEST_PNG, variant: "thumbnail", caption: "IM-THUMB" }),
      h(PdfImage, { src: TEST_PNG, variant: "avatar" }),
      h(PdfImage, { src: TEST_PNG, variant: "rounded", caption: "IM-ROUNDED" }),
      h(PdfImage, { src: TEST_PNG, width: 120, height: 60, caption: "IM-DEFAULT 120x60 contain" }),
    ]),
    label("fit in a 120x120 box: contain | cover | fill | none"),
    h("div", { class: "flex flex-row gap-4" }, ["contain", "cover", "fill", "none"].map((f) => h(PdfImage, { src: TEST_PNG, width: 120, height: 120, fit: f, caption: `IM-FIT-${f}` }))),
    label("aspectRatio 2 with width 160; position left"), h("div", { class: "flex flex-row gap-4" }, [h(PdfImage, { src: TEST_PNG, width: 160, aspectRatio: 2, fit: "fill", caption: "IM-ASPECT" }), h(PdfImage, { src: TEST_PNG, width: 60, height: 60, fit: "cover", position: "0% 50%", caption: "IM-POS-LEFT" })]),
    label("named source (options.images) + full-width cover + bordered"),
    h(PdfImage, { src: "/logo.png", variant: "cover", caption: "IM-NAMED cover 160pt" }),
    h(PdfImage, { src: { uri: TEST_PNG }, variant: "bordered", width: 200, caption: "IM-BORDERED { uri }" }),
    h(PdfImage, { src: TEST_PNG, class: "bg-[#ff00ff] p-2", width: 40, height: 20 }),
  ), options: { images: { sources: [{ src: "/logo.png", data: testPngBytes() }] } } },

  "pdf-image-remote": { title: "PdfImage (http URL)", hidden: true, component: page(el(Text, {}, "REM-BEFORE"), h(PdfImage, { src: "https://pdfwind.test/remote.png", width: 120, height: 60 }), el(Text, {}, "REM-AFTER")) },

  // oversized break-inside-avoid content must split across pages, not vanish or get clipped (hidden from the playground list)
  ...Object.fromEntries(Object.entries({
    card: () => el(Card, { title: "TALL-TITLE" }, lines(60, "TALL")),
    "keep-together": () => el(KeepTogether, {}, lines(60, "TALL")),
    section: () => el(Section, { noWrap: true, padding: "md", border: true }, lines(60, "TALL")),
    list: () => h(List, { noWrap: true, items: Array.from({ length: 60 }, (_, i) => ({ text: `TALL-${i + 1}` })) }),
    alert: () => el(Alert, { title: "TALL-TITLE" }, lines(60, "TALL")),
    table: () => el(Table, { noWrap: true, variant: "grid" }, el(TableBody, {}, Array.from({ length: 60 }, (_, i) => el(TableRow, {}, el(TableCell, {}, `TALL-${i + 1}`))))),
    "data-table": () => h(DataTable, { noWrap: true, columns: [{ key: "a", header: "TALL-H" }], data: Array.from({ length: 60 }, (_, i) => ({ a: `TALL-${i + 1}` })) }),
    "key-value": () => h(KeyValue, { noWrap: true, items: Array.from({ length: 60 }, (_, i) => ({ key: `TALL-${i + 1}`, value: "v" })) }),
    form: () => h(Form, { noWrap: true, groups: [{ fields: Array.from({ length: 40 }, (_, i) => ({ label: `TALL-${i + 1}`, height: 24 })) }] }),
    graph: () => h(Graph, { data: gData, height: 3000, width: 300, title: "TALL-GRAPH" }),
    image: () => h(PdfImage, { src: TEST_PNG, width: 400, height: 1200, fit: "fill", caption: "TALL-IMAGE" }),
  }).map(([k, make]) => [`tall-${k}`, { title: `tall ${k}`, hidden: true, component: page(el(Text, {}, "TALL-BEFORE"), make, el(Text, {}, "TALL-AFTER")) }])),

  // ---------------- phase 3a: invoice blocks ----------------
  "components-all": { title: "Theme sampler (every component)", component: { render: () => h("div", sampler()) }, options: {} },

  "invoice-classic": blockDemo("Invoice: classic", InvoiceClassic, invoiceClassicSample),
  "invoice-consultant": blockDemo("Invoice: consultant", InvoiceConsultant, invoiceConsultantSample),
  "invoice-corporate": blockDemo("Invoice: corporate", InvoiceCorporate, invoiceCorporateSample),
  "invoice-creative": blockDemo("Invoice: creative", InvoiceCreative, invoiceCreativeSample, InvoiceCreativeFooter),
  "invoice-minimal": blockDemo("Invoice: minimal", InvoiceMinimal, invoiceMinimalSample),
  "invoice-modern": blockDemo("Invoice: modern", InvoiceModern, invoiceModernSample),
  "invoice-modern-long": blockDemo("Invoice: modern, 60 items", InvoiceModern, { ...invoiceModernSample, items: manyItems(60) }, InvoiceFooter, { hidden: true }),
  "report-financial": optsDemo("Report: financial", ReportFinancial, reportFinancialSample, reportFinancialOptions),
  "report-marketing": optsDemo("Report: marketing", ReportMarketing, reportMarketingSample, reportMarketingOptions),
  "report-operations": optsDemo("Report: operations", ReportOperations, reportOperationsSample, reportOperationsOptions),
  "report-security": optsDemo("Report: security", ReportSecurity, reportSecuritySample, reportSecurityOptions),
  "event-agenda": optsDemo("Event agenda", EventAgenda, eventAgendaSample, eventAgendaOptions),
  "event-ticket": optsDemo("Event ticket", EventTicket, eventTicketSample, eventTicketOptions),
  "gift-certificate": optsDemo("Gift certificate", GiftCertificate, giftCertificateSample, giftCertificateOptions),
  "lesson-plan": optsDemo("Lesson plan", LessonPlan, lessonPlanSample, lessonPlanOptions),
  "medical-intake-form": optsDemo("Medical intake form", MedicalIntakeForm, medicalIntakeFormSample, medicalIntakeFormOptions),
  "meeting-minutes": optsDemo("Meeting minutes", MeetingMinutes, meetingMinutesSample, meetingMinutesOptions),
  "packing-slip": optsDemo("Packing slip", PackingSlip, packingSlipSample, packingSlipOptions),
  "press-release": optsDemo("Press release", PressRelease, pressReleaseSample, pressReleaseOptions),
  "shipping-label": optsDemo("Shipping label", ShippingLabel, shippingLabelSample, shippingLabelOptions),
  "work-order": optsDemo("Work order", WorkOrder, workOrderSample, workOrderOptions),
};
