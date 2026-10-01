import { h } from "vue";
import Footer from "./shared/Footer.vue";
import { lessonPlanSample, packingSlipSample, pressReleaseSample, workOrderSample } from "./doc.js";

// repeating footer bands for the single-text blocks: left text from the data + "Page n of N" (they receive the block's props, { data })
const band = (sample, props) => ({ props: ["data"], render() { return h(Footer, props(this.data ?? sample)); } });
export const LessonPlanFooter = band(lessonPlanSample, (d) => ({ data: {}, text: `${d.subject} · ${d.gradeLevel} · ${d.lessonTitle}` }));
export const PackingSlipFooter = band(packingSlipSample, (d) => ({ data: {}, text: d.customerService ?? d.companyName }));
export const WorkOrderFooter = band(workOrderSample, (d) => ({ data: {}, text: d.warrantyInfo }));
export const PressReleaseFooter = band(pressReleaseSample, (d) => ({ data: {}, text: d.address ?? d.companyName, rightText: d.socialLinks?.length ? d.socialLinks.map((l) => l.platform).join(" · ") : undefined }));
