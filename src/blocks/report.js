// Report blocks: pdfcn's BaseReportData shape and neutral sample data. Page setup lives in each block's `renderOptions`.
// data: { title, subtitle, generatedAt, period, author, summary: [{ label, value, trend?, tone? }],
//         rows: [{ label, owner, status, progress, risk? }], series: [{ label, value }], highlights: [string], footerText? }
const weeks = (values) => values.map((value, i) => ({ label: `W${i + 1}`, value }));
const base = { generatedAt: "February 23, 2026", footerText: "Confidential — Internal Use" };

export const reportFinancialSample = { ...base, author: "Finance Ops", period: "Q1 2026", title: "Quarterly Financial Report", subtitle: "Revenue, margin, and expense control overview",
  highlights: ["Revenue accelerated after enterprise expansion campaign launch.", "Gross margin improved due to infrastructure cost renegotiation.", "Collections requires executive follow-up on two overdue accounts."],
  summary: [{ label: "Revenue", tone: "success", trend: "+14.2% QoQ", value: "$2.48M" }, { label: "Gross Margin", tone: "success", trend: "+2.1 pts", value: "61.8%" }, { label: "Opex", tone: "success", trend: "-3.4% QoQ", value: "$0.93M" }, { label: "Runway", tone: "info", trend: "Stable", value: "22 months" }],
  rows: [{ label: "Enterprise Sales", owner: "A. Patel", progress: 88, risk: "Low", status: "On Track" }, { label: "SMB Sales", owner: "L. Khan", progress: 79, risk: "Medium", status: "On Track" }, { label: "Collections", owner: "J. Reyes", progress: 63, risk: "High", status: "At Risk" }, { label: "Cost Optimization", owner: "K. Singh", progress: 82, risk: "Low", status: "On Track" }],
  series: weeks([72, 74, 76, 77, 79, 80, 81, 83, 82, 84, 86, 88]) };
export const reportMarketingSample = { ...base, author: "Growth Team", period: "Campaign Cycle 2026-02", title: "Growth & Marketing Report", subtitle: "Pipeline, conversion efficiency, and channel performance",
  highlights: ["Channel mix improved CAC while maintaining lead quality.", "Lifecycle email workflow has deliverability issues under investigation.", "Referral program is producing higher-intent pipeline with lower cost."],
  summary: [{ label: "MQLs", tone: "success", trend: "+22.1% cycle", value: "3,940" }, { label: "CAC", tone: "success", trend: "-7.4%", value: "$118" }, { label: "Win Rate", tone: "info", trend: "+1.1 pts", value: "28.6%" }, { label: "Churn Risk", tone: "warning", trend: "+0.8 pts", value: "6.2%" }],
  rows: [{ label: "SEO", owner: "H. Evans", progress: 84, risk: "Low", status: "On Track" }, { label: "Paid Search", owner: "K. Martin", progress: 80, risk: "Low", status: "On Track" }, { label: "Lifecycle Email", owner: "V. Lee", progress: 64, risk: "Medium", status: "At Risk" }, { label: "Partner Referrals", owner: "J. Gomez", progress: 75, risk: "Medium", status: "On Track" }],
  series: weeks([55, 57, 59, 60, 62, 63, 65, 67, 66, 68, 70, 72]) };
export const reportOperationsSample = { ...base, author: "Delivery Office", period: "February 2026", title: "Monthly Operations Report", subtitle: "Delivery throughput, SLA adherence, and backlog visibility",
  highlights: ["SLA improved after shift rebalancing and incident triage changes.", "Backlog grew in week 4 due to release-related ticket surge.", "Incident queue remediation plan has executive sponsorship and budget."],
  summary: [{ label: "Tickets Closed", tone: "success", trend: "+9.8% MoM", value: "1,284" }, { label: "SLA Hit Rate", tone: "success", trend: "+1.4 pts", value: "96.1%" }, { label: "Backlog", tone: "warning", trend: "+6.0%", value: "214" }, { label: "Escalations", tone: "success", trend: "-18.5%", value: "17" }],
  rows: [{ label: "L1 Support", owner: "N. Mehta", progress: 91, risk: "Low", status: "On Track" }, { label: "L2 Support", owner: "D. Chen", progress: 85, risk: "Low", status: "On Track" }, { label: "Incident Queue", owner: "R. Walker", progress: 66, risk: "High", status: "At Risk" }, { label: "Automation Rollout", owner: "M. Roy", progress: 77, risk: "Medium", status: "On Track" }],
  series: weeks([69, 71, 73, 74, 75, 76, 78, 79, 78, 80, 81, 83]) };
export const reportSecuritySample = { ...base, author: "Security Engineering", period: "Sprint 05, 2026", title: "Security Posture Report", subtitle: "Vulnerability trends, control maturity, and remediation health",
  highlights: ["Critical vulnerabilities reduced through mandatory patch windows.", "Secrets rotation remains the highest-risk stream and needs additional staffing.", "External penetration test scheduled for next sprint to validate fixes."],
  summary: [{ label: "Critical Vulns", tone: "success", trend: "-3 from last sprint", value: "2" }, { label: "Patch SLA", tone: "success", trend: "+5.3 pts", value: "92.0%" }, { label: "Open Findings", tone: "warning", trend: "+4", value: "41" }, { label: "Control Score", tone: "info", trend: "+2 pts", value: "84/100" }],
  rows: [{ label: "Identity Hardening", owner: "E. Brown", progress: 87, risk: "Low", status: "On Track" }, { label: "Secrets Rotation", owner: "P. Nair", progress: 58, risk: "High", status: "At Risk" }, { label: "Dependency Scanning", owner: "I. Shah", progress: 81, risk: "Medium", status: "On Track" }, { label: "WAF Policy", owner: "S. Reed", progress: 76, risk: "Low", status: "On Track" }],
  series: weeks([61, 63, 64, 66, 67, 68, 69, 71, 72, 74, 76, 78]) };

export const reportPage = { size: "a4", margin: { top: 64, right: 64, left: 64, bottom: "auto" } }; // 48pt margins
