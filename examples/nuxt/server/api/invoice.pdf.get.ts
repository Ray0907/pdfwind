import { InvoiceModern, InvoiceFooter, blockPage, invoiceModernSample } from "../../pdfwind/src/blocks/index.js";
import { themeNames } from "../../pdfwind/src/themes/index.js";

// GET /api/invoice.pdf?theme=vivid&number=INV-2026-017&company=Acme%20Co&client=Globex&currency=EUR
// Every parameter is optional and validated; a bad one is a 400 with a message that says what to send.
const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD"];
const one = (v: unknown) => (Array.isArray(v) ? v[0] : v) as string | undefined;
const bad = (message: string) => createError({ statusCode: 400, statusMessage: "Bad Request", message });
const text = (name: string, v: string | undefined, max = 60) => {
  if (v === undefined) return undefined;
  if (!v.trim() || v.length > max || /[\u0000-\u001f]/.test(v)) throw bad(`"${name}" must be 1-${max} printable characters.`);
  return v.trim();
};

export default defineEventHandler(async (event) => {
  const q = getQuery(event);
  const theme = one(q.theme) ?? "default";
  if (!themeNames.includes(theme)) throw bad(`Unknown theme "${theme.slice(0, 40)}". Valid themes: ${themeNames.join(", ")}.`);
  const number = one(q.number);
  if (number !== undefined && !/^[A-Za-z0-9-]{1,24}$/.test(number)) throw bad(`"number" must be 1-24 letters, digits or dashes (for example INV-2026-017).`);
  const currency = one(q.currency) ?? "USD";
  if (!CURRENCIES.includes(currency)) throw bad(`Unknown currency "${currency.slice(0, 8)}". Valid currencies: ${CURRENCIES.join(", ")}.`);
  const company = text("company", one(q.company)), client = text("client", one(q.client));

  const data = {
    ...invoiceModernSample,
    ...(number && { invoiceNumber: number }),
    ...(company && { companyName: company }),
    ...(client && { billTo: { ...invoiceModernSample.billTo, name: client } }),
  };
  const pdf = await renderPdf(InvoiceModern, { data, currency }, { ...blockPage, footer: InvoiceFooter, theme, metadata: { title: `Invoice ${data.invoiceNumber}` } });
  setHeader(event, "content-type", "application/pdf");
  setHeader(event, "content-disposition", `inline; filename="${data.invoiceNumber}.pdf"`);
  setHeader(event, "cache-control", "no-store");
  return Buffer.from(pdf);
});
