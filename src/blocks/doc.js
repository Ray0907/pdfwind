// lesson-plan / medical-intake-form / meeting-minutes / packing-slip / press-release / shipping-label / work-order:
// pdfcn's data shapes with neutral sample data. Page setup lives in each block's `renderOptions`.
export const docPage = { size: "a4", margin: { top: 74.67, right: 74.67, left: 74.67, bottom: "auto" } }; // 56pt margins
export const medicalPage = { size: "a4", margin: { top: 64, right: 64, left: 64, bottom: "auto" } }; // 48pt
export const shippingLabelPage = { size: { width: 384, height: 576 }, margin: 0 }; // 4in x 6in

// lesson plan: { subject, gradeLevel, lessonTitle, date, teacherName, duration, topic?, essentialQuestion?, objectives[], standards?[], materials[],
//   sequence[{ time: "5 min", activity, description, notes? }], differentiation?[], assessment{ formative?[], summative?[] }, homework?, reflection?, accentColor? }
export const lessonPlanSample = {
  accentColor: "#7c3aed", subject: "Mathematics", gradeLevel: "8th Grade", lessonTitle: "Introduction to Linear Equations", date: "September 15, 2026", teacherName: "Ms. Johnson", duration: "50 minutes", topic: "Linear Equations",
  essentialQuestion: "How can we represent real-world relationships using linear equations?",
  objectives: ["Define linear equations", "Graph linear equations on a coordinate plane", "Solve simple linear equations"],
  standards: ["CCSS.MATH.8.EE.B.6", "CCSS.MATH.8.EE.C.7"], materials: ["Graph paper", "Rulers", "Calculator", "Whiteboard markers"],
  sequence: [{ time: "5 min", activity: "Warm-up", description: "Review solving one-step equations", notes: "5 problems on the board" }, { time: "10 min", activity: "Introduction", description: "Define linear equations, show examples", notes: "Use real-world context" }, { time: "15 min", activity: "Guided Practice", description: "Work through 3 examples together", notes: "Check for understanding" }, { time: "15 min", activity: "Independent Practice", description: "Complete worksheet problems 1-10", notes: "Circulate and support" }, { time: "5 min", activity: "Closure", description: "Exit ticket: solve one linear equation", notes: "Collect before dismissal" }],
  differentiation: ["Provide equation mats for visual learners", "Allow calculator use for students with processing difficulties", "Offer extension problems for advanced learners"],
  assessment: { formative: ["Exit ticket", "Observation during guided practice"], summative: ["Chapter quiz"] }, homework: "Complete worksheet problems 11-20",
};

// medical intake: { clinicName, clinicLogo?, clinicAddress?, clinicPhone?, personalInfo?, emergencyContact?, insurance?, medicalHistory?, medications?, allergies?, reasonForVisit?, consent? (all default true), accentColor? }
export const medicalIntakeFormSample = { accentColor: "#0d9488", clinicName: "Sunrise Family Clinic", clinicAddress: "200 Health Plaza, Springfield, USA 12345", clinicPhone: "(555) 010-0180" };

// meeting minutes: { meetingTitle, date, time, location, organizer, attendees[{ name, role? }], absent?[], guests?[], agenda[], discussions[{ topic, speaker?, notes[] }],
//   decisions[{ number, decision, rationale? }], actionItems[{ task, owner, dueDate, status: "Not Started"|"In Progress"|"Complete" }], nextMeeting?{ date, time, agenda?[] }, preparedBy, distributionList?[], accentColor? }
export const meetingMinutesSample = {
  accentColor: "#0891b2", meetingTitle: "Q3 Product Roadmap Review", date: "September 12, 2026", time: "2:00 PM - 3:30 PM", location: "Conference Room B / Zoom", organizer: "Alex Kim", preparedBy: "Alex Kim",
  attendees: [{ name: "Alex Kim", role: "Product Lead" }, { name: "Jordan Lee", role: "Engineering Lead" }, { name: "Sam Patel", role: "Design Lead" }], absent: [{ name: "Casey Wu", role: "QA Lead" }], guests: ["Riya Shah (Advisor)"],
  agenda: ["Review Q2 outcomes", "Q3 feature priorities", "Resource allocation", "Timeline and milestones"],
  discussions: [{ topic: "Q2 Outcomes", speaker: "Alex Kim", notes: ["Shipped 4 of 5 planned features", "Customer satisfaction up 12%"] }, { topic: "Q3 Feature Priorities", speaker: "Jordan Lee", notes: ["Document export module is top priority", "Community page scheduled for late Q3"] }],
  decisions: [{ number: 1, decision: "Proceed with the new export engine as the second rendering base", rationale: "Better layout support" }, { number: 2, decision: "Allocate 2 engineers to the export module full-time" }],
  actionItems: [{ task: "Create export engine RFC", owner: "Jordan Lee", dueDate: "Sep 19, 2026", status: "In Progress" }, { task: "Design community page wireframes", owner: "Sam Patel", dueDate: "Sep 22, 2026", status: "Not Started" }, { task: "Share Q2 outcomes deck with stakeholders", owner: "Alex Kim", dueDate: "Sep 26, 2026", status: "Complete" }],
  nextMeeting: { date: "September 19, 2026", time: "2:00 PM", agenda: ["Review action items", "Export RFC walkthrough"] }, distributionList: ["product-team@acme.example", "eng-leads@acme.example"],
};

// packing slip: { companyName, companyLogo?, orderNumber, orderDate, poNumber?, shipTo{ name, address, city, state, zip, country?, phone? }, shipFrom{ ... }, items[{ name, sku, qtyPacked, qtyOrdered, unitPrice }],
//   shipping{ carrier, method, trackingNumber, estimatedDelivery? }, totalPackages?, totalWeight?, returnsPolicy?, customerService?, thankYouMessage?, accentColor?, currency? }
export const packingSlipSample = {
  accentColor: "#059669", companyName: "Acme Store", orderNumber: "ORD-2026-0891", orderDate: "Sep 10, 2026", poNumber: "PO-4471",
  shipTo: { name: "Jane Doe", address: "456 Oak Ave", city: "Portland", state: "OR", zip: "97201", phone: "(503) 555-0142" }, shipFrom: { name: "Acme Warehouse", address: "100 Industrial Blvd", city: "Seattle", state: "WA", zip: "98101" },
  items: [{ name: "Widget Pro", sku: "WP-001", qtyPacked: 2, qtyOrdered: 2, unitPrice: 49.99 }, { name: "Gadget Lite", sku: "GL-010", qtyPacked: 1, qtyOrdered: 1, unitPrice: 29.99 }, { name: "Cable Kit", sku: "CK-204", qtyPacked: 2, qtyOrdered: 3, unitPrice: 9.5 }],
  shipping: { carrier: "UPS", method: "Ground", trackingNumber: "1Z999AA10123456784", estimatedDelivery: "Sep 15, 2026" }, totalPackages: 1, totalWeight: "3.2 kg",
  returnsPolicy: "Returns accepted within 30 days with original packaging.", customerService: "support@acme-store.example", thankYouMessage: "Thank you for your order!",
};

// press release: { companyName, companyLogo?, date, headline, subheadline?, dateline{ city, state }, body[], quotes?[{ text, author, title }], boilerplate, mediaContact{ name, email, phone, website? }, address?, socialLinks?[{ platform, url }], accentColor? }
export const pressReleaseSample = {
  accentColor: "#1e40af", companyName: "Acme Corp", date: "September 10, 2026", address: "123 Market St, San Francisco, CA 94103",
  headline: "Acme Corp Launches Revolutionary Document Toolkit for Developers", subheadline: "New open-source library makes generating professional documents effortless", dateline: { city: "San Francisco", state: "CA" },
  body: ["Acme Corp today announced the launch of DocKit, an open-source component library for generating professional documents.", "DocKit is designed to work seamlessly with modern UI stacks and follows a registry-based distribution model, letting developers add print-ready document blocks with a single CLI command."],
  quotes: [{ text: "We built DocKit because generating documents in code was unnecessarily painful. Now it feels like writing any other component.", author: "Jane Doe", title: "CTO, Acme Corp" }],
  boilerplate: "Acme Corp is a leading provider of developer tools and open-source software.", mediaContact: { name: "Press Team", email: "press@acme.example", phone: "(555) 123-4567" }, socialLinks: [{ platform: "GitHub", url: "https://github.com/acme" }, { platform: "X", url: "https://x.com/acme" }],
};

// shipping label (4x6in): { from{ name, address, city, state, zip, country? }, to{ ..., phone? }, carrier, serviceLevel, trackingNumber, weight?, dimensions?, packageCount?, handlingLabels?[], postage? ("PAID" if omitted), accentColor? }; QR = trackingNumber
export const shippingLabelSample = {
  carrier: "UPS", serviceLevel: "Ground", trackingNumber: "TRACK123456789US", weight: "2.5 kg", dimensions: '12" x 8" x 6"', packageCount: 1, postage: "$18.40", handlingLabels: ["FRAGILE", "THIS SIDE UP"],
  from: { name: "ACME Corporation", address: "456 Industrial Blvd", city: "Los Angeles", state: "CA", zip: "90001", country: "USA" }, to: { name: "John Doe", address: "123 Main Street, Apt 4B", city: "New York", state: "NY", zip: "10001", country: "USA", phone: "(503) 555-0142" },
};

// work order: { companyName, companyLogo?, workOrderNumber, date, priority: "Low"|"Medium"|"High"|"Urgent", customer{ name, address, phone, email?, accountNumber? }, technician, jobType,
//   equipment{ description, makeModel?, serialNumber?, location? }, parts[{ partNumber, description, qty, unitPrice }], labor[{ description, technician, hours, rate }], taxRate?, technicianNotes?, customerNotes?, warrantyInfo?, accentColor? }
export const workOrderSample = {
  accentColor: "#ea580c", companyName: "FixIt Pro Services", workOrderNumber: "WO-2026-0452", date: "September 10, 2026", priority: "High", jobType: "Repair", technician: "Mike Torres", taxRate: 0.0825,
  customer: { name: "Riverside Apartments", address: "789 Elm St, Austin, TX 78701", phone: "(512) 555-0199", accountNumber: "ACC-10234" }, equipment: { description: "Commercial Dishwasher", makeModel: "Bosch SHP878ZD5N", serialNumber: "BSH-2024-88712", location: "Kitchen — Unit 4B" },
  parts: [{ partNumber: "PUMP-001", description: "Drain Pump Assembly", qty: 1, unitPrice: 89.99 }, { partNumber: "HOSE-012", description: "Drain Hose Kit", qty: 1, unitPrice: 24.5 }], labor: [{ description: "Diagnosis and repair", technician: "Mike Torres", hours: 2.5, rate: 95 }],
  technicianNotes: "Found clogged drain pump. Replaced pump and hose. Unit tested OK.", customerNotes: "Please service before end of month lease inspection.", warrantyInfo: "90-day warranty on parts and labor.",
};
