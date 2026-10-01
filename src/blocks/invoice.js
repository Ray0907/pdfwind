// Shared by the six invoice blocks: money formatting, totals math, and neutral sample data in pdfcn's data shape.
//
// data shape (same as pdfcn's InvoiceXData, plus a few optional fields):
//   invoiceNumber, invoiceDate, dueDate, companyName, subtitle, companyAddress, companyEmail?, logo?,
//   billTo { name, address, email, phone }, items [{ description, quantity, unitPrice }],
//   paymentTerms { dueDate, method, gst }, notes?,
//   taxRate? (0.07 = 7%, default 0)            totals are COMPUTED from items + taxRate
//   summary? { subtotal, tax, total }          optional override, pdfcn style; when given it wins
//   footerText?                                 left footer text, defaults to notes

// the reference invoices use a darker muted palette than the library default (better print contrast): applied per block
export const blockVars = { "--muted-foreground": "#71717a", "--muted": "#f4f4f5" };

export const money = (n, { currency = "USD", locale = "en-US" } = {}) => new Intl.NumberFormat(locale, { style: "currency", currency }).format(n);

const round2 = (n) => Math.round(n * 100) / 100;
const lineTotal = (it) => round2((it.quantity ?? it.hours ?? 0) * (it.unitPrice ?? it.rate ?? 0));

/** subtotal / tax / total from the line items (or the explicit `data.summary`) */
export const totalsOf = (data, items = data.items ?? data.services ?? []) => {
  if (data.summary) return { subtotal: data.summary.subtotal, tax: data.summary.tax, total: data.summary.total };
  const subtotal = round2(items.reduce((s, it) => s + lineTotal(it), 0)), tax = round2(subtotal * (data.taxRate ?? 0));
  return { subtotal, tax, total: round2(subtotal + tax) };
};
export const taxLabel = (data) => (data.taxRate ? `Tax (${+(data.taxRate * 100).toFixed(2)}%)` : "Tax");
export const rowsOf = (data, fmt) => (data.items ?? []).map((it) => ({ description: it.description, quantity: it.quantity, unitPrice: fmt(it.unitPrice), amount: fmt(lineTotal(it)) }));

const base = { invoiceDate: "February 17, 2026", dueDate: "March 17, 2026", companyName: "Acme Co", subtitle: "Innovative Solutions", companyAddress: "Springfield, USA", companyEmail: "hello@acme.example" };

export const invoiceClassicSample = {
  ...base, invoiceNumber: "INV-2026-001", taxRate: 0.07,
  billTo: { name: "Client Corp.", address: "456 Client Ave, Suite 2", email: "contact@client.example", phone: "+1 (555) 123-4567" },
  items: [{ description: "Web Development", quantity: 1, unitPrice: 12500 }, { description: "UI/UX Design", quantity: 1, unitPrice: 8750 }, { description: "Consulting", quantity: 10, unitPrice: 1500 }],
  paymentTerms: { dueDate: "March 17, 2026", method: "Card / Bank Transfer", gst: "Tax ID 123456789" },
  notes: "Thank you for your business!",
};
export const invoiceConsultantSample = {
  ...base, invoiceNumber: "INV-2026-006", invoiceDate: "February 26, 2026", dueDate: "March 28, 2026", subtitle: "Professional Consulting Services", companyAddress: "Springfield, USA · hello@acme.example", taxRate: 0.05,
  consultant: { name: "John Smith", title: "Senior Technical Consultant", email: "john.smith@acme.example" },
  client: { name: "Sarah Johnson", company: "Globex Technologies", address: "500 Tech Park, Suite 200", email: "sarah.johnson@globex.example" },
  services: [{ description: "Architecture Review & Planning", hours: 16, rate: 175 }, { description: "Code Review & Optimization", hours: 24, rate: 150 }, { description: "Technical Documentation", hours: 12, rate: 125 }, { description: "Team Training & Knowledge Transfer", hours: 8, rate: 200 }],
  paymentTerms: { dueDate: "March 28, 2026", method: "Bank Transfer / Check" },
  projectRef: "PROJ-2026-GLOBEX-001",
  notes: "Services rendered for February 2026. All hours verified and approved by client.",
  footerText: "Professional services invoice – please retain for your records",
};
export const invoiceCorporateSample = {
  ...base, invoiceNumber: "INV-2026-004", invoiceDate: "February 22, 2026", dueDate: "March 24, 2026", taxRate: 0.08,
  billTo: { name: "Global Industries Ltd.", address: "100 Corporate Plaza, Tower B", email: "accounts@global.example", phone: "+1 (555) 888-9999" },
  items: [{ description: "Enterprise Software License", quantity: 5, unitPrice: 4500 }, { description: "Implementation Services", quantity: 1, unitPrice: 18000 }, { description: "Training Workshop (per session)", quantity: 3, unitPrice: 2500 }, { description: "Annual Support Package", quantity: 1, unitPrice: 8500 }],
  paymentTerms: { dueDate: "March 24, 2026", method: "Wire Transfer / Corporate Account", gst: "Tax ID 987654321" },
  notes: "Corporate billing – net 30 terms apply. For inquiries, contact accounts@acme.example",
};
export const invoiceCreativeSample = {
  ...base, invoiceNumber: "INV-2026-005", invoiceDate: "February 24, 2026", dueDate: "March 26, 2026", subtitle: "Design Studio", companyAddress: "Springfield, USA", taxRate: 0.065,
  billTo: { name: "Creative Agency Co.", address: "250 Design District, Loft 5", email: "hi@agency.example", phone: "+1 (555) 321-7654" },
  items: [{ description: "Brand Identity Design", quantity: 1, unitPrice: 8500 }, { description: "Marketing Collateral Package", quantity: 1, unitPrice: 4200 }, { description: "Social Media Assets (per set)", quantity: 4, unitPrice: 750 }, { description: "Motion Graphics (30s)", quantity: 2, unitPrice: 3500 }],
  paymentTerms: { dueDate: "March 26, 2026", method: "Credit Card / PayPal / Stripe", gst: "Tax ID 456789123" },
  notes: "Creative work is protected under copyright. Full usage rights transfer upon payment.",
  footerText: "Thank you for choosing us for your creative needs!",
};
export const invoiceMinimalSample = {
  ...base, invoiceNumber: "INV-2026-003", invoiceDate: "February 20, 2026", dueDate: "March 22, 2026", companyAddress: "Springfield, USA", taxRate: 0.07,
  billTo: { name: "Enterprise Corp", address: "500 Enterprise Way, Building A", email: "finance@enterprise.example", phone: "+1 (555) 246-8135" },
  items: [{ description: "Annual License Plan", quantity: 1, unitPrice: 25000 }, { description: "Support & Maintenance", quantity: 12, unitPrice: 1500 }, { description: "Custom Integration", quantity: 1, unitPrice: 12000 }],
  paymentTerms: { dueDate: "March 22, 2026", method: "ACH Transfer / Check", gst: "123-45-6789" },
  notes: "Invoice for annual enterprise subscription. Please retain for your records.",
};
export const invoiceModernSample = {
  ...base, invoiceNumber: "INV-2026-002", invoiceDate: "February 18, 2026", dueDate: "March 20, 2026", companyAddress: "Springfield, USA", taxRate: 0.07,
  billTo: { name: "TechStart Solutions", address: "789 Innovation Blvd, Floor 3", email: "billing@techstart.example", phone: "+1 (555) 987-6543" },
  items: [{ description: "API Integration", quantity: 1, unitPrice: 15000 }, { description: "SEO", quantity: 2, unitPrice: 5500 }, { description: "Security Audit", quantity: 1, unitPrice: 7200 }],
  paymentTerms: { dueDate: "March 20, 2026", method: "Wire Transfer / Bank Account", gst: "Tax ID 123456789" },
  notes: "Payment terms: net 30 days. Thank you for your business!",
};
