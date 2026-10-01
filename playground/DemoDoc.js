import { h } from "vue";

export const DemoDoc = {
  props: { title: { default: "Invoice 1042" }, rows: { default: 8 }, lang: { default: "zh" } }, // lang "en": no CJK text, so the Noto font is never fetched
  setup: (p) => () => h("main", { class: "text-sm text-zinc-900" }, [
    h("h1", { class: "text-2xl font-bold mb-2" }, p.title),
    h("p", { class: "mb-4" }, p.lang === "zh" ? "CJK 繁體中文測試：發票、報表、收據。 Latin text in Inter." : "English only: invoices, reports, receipts."),
    h("table", { class: "w-full" }, [
      h("thead", h("tr", { class: "bg-zinc-100 font-bold" }, ["SKU", "Name", "Amount"].map((t) => h("th", { class: "text-left py-1" }, t)))),
      h("tbody", Array.from({ length: p.rows }, (_, i) => h("tr", { class: "border-b border-zinc-200" }, [
        h("td", { class: "py-1" }, `SKU-${1000 + i}`), h("td", { class: "py-1" }, p.lang === "zh" ? `品項 ${i + 1}` : `Item ${i + 1}`), h("td", { class: "py-1" }, (i * 37.5).toFixed(2)),
      ]))),
    ]),
  ]),
};

const band = (left, right) => ({ setup: () => () => h("div", { class: "flex w-full justify-between px-8 text-[10px] text-zinc-500" }, [h("span", left), right]) });
export const DemoHeader = band("HEADER-MARK pdfwind", "");
export const DemoFooter = band("FOOTER-MARK", h("span", ["Page ", h("span", { class: "pageNumber" }), " / ", h("span", { class: "totalPages" })]));
