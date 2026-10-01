// event-agenda / event-ticket / gift-certificate: pdfcn's data shapes with neutral sample data.

// agenda: { eventName, date, endDate?, venue, accentColor?, tracks?: [{ name, color }], wifiInfo?, emergencyContact?,
//           days: [{ label, date, sessions: [{ time, endTime?, title, track?, room?, speaker?, description?, isBreak? }] }] }
export const eventAgendaSample = {
  accentColor: "destructive", eventName: "Acme Dev Summit 2026", date: "October 20, 2026", endDate: "October 21, 2026", venue: "Springfield Convention Center",
  wifiInfo: "Network: AcmeSummit / Password: summit2026", emergencyContact: "Organizers Desk: +1 555 0100 | help@acme-summit.example",
  tracks: [{ name: "Core Web", color: "info" }, { name: "Ecosystem", color: "success" }, { name: "Workshop", color: "warning" }],
  days: [
    { label: "Day 1", date: "October 20, 2026", sessions: [
      { time: "8:00 AM", endTime: "9:00 AM", isBreak: true, title: "Registration & Breakfast", description: "Check-in, grab your badge, and enjoy breakfast with peers." },
      { time: "9:00 AM", endTime: "9:45 AM", track: "Core Web", room: "Main Hall", speaker: "Dana Whitfield", title: "Opening Keynote: The Next Decade of Web UI", description: "An overview of recent evolutions and the road ahead for UI engineering." },
      { time: "10:00 AM", endTime: "10:45 AM", track: "Core Web", room: "Room A", speaker: "Sam Rivera", title: "Server Rendering in Production", description: "Real-world architecture patterns, streaming benefits, and edge-case handling." },
      { time: "10:00 AM", endTime: "10:45 AM", track: "Ecosystem", room: "Room B", speaker: "Mina Okafor", title: "State Management in 2026", description: "Navigating signals, atomic state, and server state synchronization." },
      { time: "11:00 AM", endTime: "11:30 AM", isBreak: true, title: "Coffee & Networking Break", description: "Exhibition hall coffee stations open." },
      { time: "11:30 AM", endTime: "12:15 PM", track: "Core Web", room: "Room A", speaker: "Priya Nandakumar", title: "Building Accessible Design Systems", description: "Ensuring WCAG AAA compliance with composable headless components." },
      { time: "11:30 AM", endTime: "12:15 PM", track: "Ecosystem", room: "Room B", speaker: "Leo Fontaine", title: "Compiler Deep Dive: Under the Hood", description: "How automatic memoization transforms rendering pipelines." },
      { time: "12:30 PM", endTime: "1:45 PM", isBreak: true, title: "Catered Lunch & Sponsor Showcase", description: "Lunch served in the Grand Ballroom." },
      { time: "2:00 PM", endTime: "3:30 PM", track: "Workshop", room: "Workshop Lab", speaker: "Kenji Aoki", title: "Interactive Workshop: Building with Actions", description: "Hands-on exercises exploring actions, optimistic updates, and new hooks." },
      { time: "2:00 PM", endTime: "3:30 PM", track: "Ecosystem", room: "Room A", speaker: "Zoe Lambert", title: "Micro-Frontends at Scale", description: "Module federation techniques across distributed product teams." },
      { time: "3:30 PM", endTime: "4:00 PM", isBreak: true, title: "Afternoon Refreshments" },
      { time: "4:00 PM", endTime: "5:00 PM", track: "Core Web", room: "Main Hall", speaker: "Omar Haddad", title: "Closing Keynote & Community Q&A", description: "Reflections on Day 1 highlights, open mic session, and evening preview." },
    ] },
    { label: "Day 2", date: "October 21, 2026", sessions: [
      { time: "8:30 AM", endTime: "9:30 AM", isBreak: true, title: "Welcome Coffee & Light Breakfast", description: "Morning refreshments in the networking lounge." },
      { time: "9:30 AM", endTime: "10:30 AM", track: "Core Web", room: "Main Hall", speaker: "Ines Duarte", title: "Future of the Web & AI Agent Integrations", description: "How generative agents and generative UI are shaping application architectures." },
      { time: "10:45 AM", endTime: "11:45 AM", track: "Core Web", room: "Room A", speaker: "Tomas Berg", title: "Performance Profiling for Modern Web Apps", description: "Actionable metrics, Core Web Vitals, and avoiding main-thread bottlenecks." },
      { time: "10:45 AM", endTime: "11:45 AM", track: "Ecosystem", room: "Room B", speaker: "Hana Sato", title: "Offline-First Architecture with Local-First Databases", description: "Sync engines, conflict resolution, and ultra-fast client-side queries." },
      { time: "12:00 PM", endTime: "1:15 PM", isBreak: true, title: "Lunch & Community Lightning Talks", description: "Quick 5-minute community-submitted presentations in the theater." },
      { time: "1:30 PM", endTime: "3:00 PM", track: "Workshop", room: "Workshop Lab", speaker: "Lucia Moretti", title: "Hands-on Performance Optimization Workshop", description: "Profiling real-world codebases, memory leak identification, and bundle size reduction." },
      { time: "3:15 PM", endTime: "4:15 PM", track: "Ecosystem", room: "Main Hall", speaker: "Industry Panelists", title: "Panel Discussion: What's Next for Developer Tooling", description: "Bundlers, linters, formatters, and next-generation dev speed." },
      { time: "4:30 PM", endTime: "6:00 PM", isBreak: true, title: "Closing Reception & Networking Afterparty", description: "Drinks and appetizers at the convention terrace." },
    ] },
  ],
};

// ticket: { eventName, eventDate, eventTime, venue, address, ticketNumber, ticketType, doorsOpen?, organizer?, seat?: { section, row, number },
//           terms?, socialLinks?: [{ platform, url }], accentColor?, logoUrl?, qrCodeUrl? }  (QR defaults to the ticket number)
export const eventTicketSample = { accentColor: "accent", organizer: "Acme Events", eventName: "Acme Dev Conf", eventDate: "May 15, 2026", eventTime: "9:00 AM", doorsOpen: "8:00 AM", venue: "Convention Center", address: "123 Main St, Springfield", seat: { section: "A", row: "3", number: "12" }, ticketNumber: "TKT-00142", ticketType: "VIP", terms: "Ticket is non-transferable. All sales final. No re-entry.", socialLinks: [{ platform: "X", url: "x.com/acmeevents" }, { platform: "Instagram", url: "instagram.com/acmeevents" }] };

// certificate: { companyName, companyLogo?, amount, currency?, recipientName, senderName, message?, certificateCode, expiryDate,
//                redemptionInstructions?, terms?, companyContact?, accentColor? }
export const giftCertificateSample = { accentColor: "primary", companyName: "Acme Co", amount: 50, currency: "USD", recipientName: "Sarah", senderName: "Mom & Dad", message: "Happy Birthday! Enjoy a coffee on us.", certificateCode: "ACME-GC-2026-00891", expiryDate: "March 31, 2027", redemptionInstructions: "Present this certificate at any Acme Co location.", terms: "No cash value. Non-refundable. One use per visit." };

export const eventAgendaPage = { size: "a4", margin: { top: 42.67, right: 42.67, left: 42.67, bottom: "auto" } }; // 32pt
export const eventTicketPage = { size: { width: 672, height: 336 }, margin: 0 }; // 7in x 3.5in
export const giftCertificatePage = { size: "a4", margin: { top: 88, right: 88, left: 88, bottom: 88 } }; // 66pt
