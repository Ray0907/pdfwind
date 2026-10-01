import { h } from "vue";
import Footer from "./shared/Footer.vue";

export { default as InvoiceClassic } from "./InvoiceClassic/InvoiceClassic.vue";
export { default as InvoiceConsultant } from "./InvoiceConsultant/InvoiceConsultant.vue";
export { default as InvoiceCorporate } from "./InvoiceCorporate/InvoiceCorporate.vue";
export { default as InvoiceCreative } from "./InvoiceCreative/InvoiceCreative.vue";
export { default as InvoiceMinimal } from "./InvoiceMinimal/InvoiceMinimal.vue";
export { default as InvoiceModern } from "./InvoiceModern/InvoiceModern.vue";
export { default as ReportFinancial, renderOptions as reportFinancialOptions } from "./ReportFinancial/ReportFinancial.vue";
export { default as ReportMarketing, renderOptions as reportMarketingOptions } from "./ReportMarketing/ReportMarketing.vue";
export { default as ReportOperations, renderOptions as reportOperationsOptions } from "./ReportOperations/ReportOperations.vue";
export { default as ReportSecurity, renderOptions as reportSecurityOptions } from "./ReportSecurity/ReportSecurity.vue";
export { default as EventAgenda, renderOptions as eventAgendaOptions } from "./EventAgenda/EventAgenda.vue";
export { default as EventTicket, renderOptions as eventTicketOptions } from "./EventTicket/EventTicket.vue";
export { default as GiftCertificate, renderOptions as giftCertificateOptions } from "./GiftCertificate/GiftCertificate.vue";
export { default as LessonPlan, renderOptions as lessonPlanOptions } from "./LessonPlan/LessonPlan.vue";
export { default as MedicalIntakeForm, renderOptions as medicalIntakeFormOptions } from "./MedicalIntakeForm/MedicalIntakeForm.vue";
export { default as MeetingMinutes, renderOptions as meetingMinutesOptions } from "./MeetingMinutes/MeetingMinutes.vue";
export { default as PackingSlip, renderOptions as packingSlipOptions } from "./PackingSlip/PackingSlip.vue";
export { default as PressRelease, renderOptions as pressReleaseOptions } from "./PressRelease/PressRelease.vue";
export { default as ShippingLabel, renderOptions as shippingLabelOptions } from "./ShippingLabel/ShippingLabel.vue";
export { default as WorkOrder, renderOptions as workOrderOptions } from "./WorkOrder/WorkOrder.vue";
export * from "./doc.js";
export * from "./footers.js";
export * from "./invoice.js";
export * from "./report.js";
export * from "./event.js";

/** Repeating footer band (left text + "Page n of N") to pass as renderPdf's `footer` option. */
export const InvoiceFooter = Footer;
export const InvoiceCreativeFooter = { props: ["data"], render() { return h(Footer, { data: this.data, variant: "centered" }); } };

/** The page setup the blocks were designed for (A4, 56pt margins on every side, the footer band reserves the bottom). */
export const blockPage = { size: "a4", margin: { top: 74.67, right: 74.67, left: 74.67, bottom: "auto" } };
