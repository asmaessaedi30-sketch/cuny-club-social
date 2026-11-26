import type { ClubResource } from '../src/types.ts';

export interface ClubResourceEntry extends ClubResource {
  content: string;
}

export const OFFICIAL_CLUB_RESOURCES: ClubResourceEntry[] = [
  {
    resourceId: 'res-brand-wordmark',
    title: 'CUNY SPS Official Wordmark & Club Lockup',
    category: 'Branding Assets',
    description:
      'Scalable vector header lockup in CUNY Royal Blue (#004B87) for flyers, digital banners, and Zoom event slides.',
    fileName: 'CUNY_SPS_Official_Wordmark_Lockup.svg',
    fileFormat: 'SVG',
    mimeType: 'image/svg+xml',
    version: 'v2.4',
    updatedAt: '2026-10-15',
    publishedBy: 'Office of Student Life & CUNY Communications',
    audienceNote: 'Required on all external club event graphics',
    content: `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="240" viewBox="0 0 960 240" role="img" aria-label="CUNY School of Professional Studies Student Organizations Lockup">
  <rect width="960" height="240" fill="#FFFFFF"/>
  <rect x="0" y="0" width="960" height="14" fill="#004B87"/>
  <rect x="48" y="48" width="144" height="144" rx="8" fill="#004B87"/>
  <text x="120" y="114" text-anchor="middle" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="700" letter-spacing="2">CUNY</text>
  <text x="120" y="152" text-anchor="middle" fill="#BAE6FD" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" letter-spacing="3">SPS</text>
  <text x="224" y="102" fill="#0F172A" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700">CUNY School of Professional Studies</text>
  <text x="224" y="140" fill="#004B87" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="600">Recognized Student Organization Official Lockup</text>
  <text x="224" y="174" fill="#475569" font-family="Arial, Helvetica, sans-serif" font-size="14">Office of Student Life · 119 West 31st Street, New York, NY 10001</text>
  <rect x="0" y="232" width="960" height="8" fill="#E2E8F0"/>
</svg>`,
  },
  {
    resourceId: 'res-brand-avatar',
    title: 'Official Social Profile Emblem Badge (1:1)',
    category: 'Branding Assets',
    description:
      'Square 1080x1080 vector badge template formatted for Facebook Pages, Instagram Professional, and LinkedIn club avatars.',
    fileName: 'CUNY_SPS_Social_Avatar_Badge.svg',
    fileFormat: 'SVG',
    mimeType: 'image/svg+xml',
    version: 'v1.8',
    updatedAt: '2026-10-18',
    publishedBy: 'CUNY Communications',
    audienceNote: 'Sized for Instagram & Facebook profile frames',
    content: `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080" role="img" aria-label="CUNY SPS Club Social Profile Badge">
  <rect width="1080" height="1080" fill="#004B87"/>
  <rect x="64" y="64" width="952" height="952" rx="36" fill="none" stroke="#FFFFFF" stroke-opacity="0.28" stroke-width="6"/>
  <text x="540" y="450" text-anchor="middle" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="148" font-weight="800" letter-spacing="8">CUNY SPS</text>
  <line x1="280" y1="510" x2="800" y2="510" stroke="#93C5FD" stroke-width="6"/>
  <text x="540" y="600" text-anchor="middle" fill="#E0F2FE" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="600" letter-spacing="4">STUDENT ORGANIZATION</text>
  <text x="540" y="680" text-anchor="middle" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="400">Official Office of Student Life Channel</text>
</svg>`,
  },
  {
    resourceId: 'res-brand-guide',
    title: 'CUNY SPS Brand Color, Typography & Accessibility Guide',
    category: 'Branding Assets',
    description:
      'Official hex palette, WCAG 2.2 AA contrast pairings, CamelCase hashtag standards, and alt-text rules for club media.',
    fileName: 'CUNY_SPS_Brand_Accessibility_Guide.md',
    fileFormat: 'MD',
    mimeType: 'text/markdown; charset=utf-8',
    version: 'v3.0',
    updatedAt: '2026-11-01',
    publishedBy: 'Office of Student Life',
    audienceNote: 'Essential checklist before scheduling social posts',
    content: `# CUNY SPS Student Organization Brand & Accessibility Guide

## 1. Official Color Palette
- **CUNY Royal Blue (Primary)**: \`#004B87\` (Use with \`#FFFFFF\` white text — Contrast 8.7:1, WCAG AAA)
- **Executive Slate Ink (Headings)**: \`#0F172A\` on \`#FFFFFF\` or \`#F8FAFC\`
- **Muted Body Slate**: \`#475569\` on \`#FFFFFF\`
- **Border Hairline**: \`#E2E8F0\`

## 2. Typography & Logo Clear Space
- Headings: **Plus Jakarta Sans** (Bold / Semibold)
- Body & Flyers: **Public Sans** or **Inter**
- Maintain at least 24px clear space around the CUNY SPS lockup; never stretch or recolor the official emblem.

## 3. Social Media WCAG 2.2 AA Accessibility Checklist
1. **Alt-Text Required**: Describe all event details (title, date, time, Zoom/room) in under 140 characters.
2. **CamelCase Hashtags**: Always write \`#CUNYSPS\`, \`#StudentLife\`, \`#AIClub\` so screen readers pronounce words cleanly.
3. **Avoid Text-Only Flyers Without Caption Context**: Repeat all date/time/RSVP links inside the post caption.
`,
  },
  {
    resourceId: 'res-evt-proposal',
    title: 'Student Organization Event Proposal Template',
    category: 'Event Proposal Templates',
    description:
      'Standard Student Life event approval template covering learning outcomes, Zoom/room logistics, accessibility, and budget estimate.',
    fileName: 'CUNY_SPS_Event_Proposal_Template.md',
    fileFormat: 'MD',
    mimeType: 'text/markdown; charset=utf-8',
    version: '2026–2027',
    updatedAt: '2026-10-20',
    publishedBy: 'Office of Student Life',
    audienceNote: 'Submit at least 15 business days prior to event',
    content: `# CUNY SPS Student Organization Event Proposal Template

## Section A: Organization & Contact Details
- **Club / Organization Name**:
- **Submitting Officer Name & Title**:
- **Institutional Email (@spsmail.cuny.edu)**:
- **Faculty Advisor Name**:

## Section B: Event Overview
- **Proposed Event Title**:
- **Event Format**: [ ] Virtual (Zoom)  [ ] Hybrid  [ ] In-Person (119 W 31st St)
- **Proposed Date & Time (ET)**:
- **Expected Attendance**:
- **Alignment with Club Mission & Student Engagement Goals**:

## Section C: Accessibility & Inclusion Plan
- **Live Captioning / ASL Requested?**: [ ] Yes (Zoom Auto-Captions + Transcript)  [ ] Additional Accommodations Needed
- **Promotional Flyer Alt-Text Prepared?**: [ ] Yes

## Section D: Budget & Vendor Summary
- **Estimated Total Cost ($)**:
- **Itemized Breakdown** (Refreshments / Speaker Honorarium / Supplies):
- **Funding Source**: [ ] Student Activity Fee Allocation  [ ] Zero-Cost Event

## Section E: Sign-Off
- **Club President Signature / Date**: ____________________________
- **Faculty Advisor Endorsement / Date**: ______________________
`,
  },
  {
    resourceId: 'res-evt-cosponsor',
    title: 'Guest Speaker & Multi-Club Co-Sponsorship Proposal',
    category: 'Event Proposal Templates',
    description:
      'Template for inviting external industry/academic speakers or partnering across multiple CUNY SPS student clubs.',
    fileName: 'CUNY_SPS_Speaker_CoSponsorship_Template.md',
    fileFormat: 'MD',
    mimeType: 'text/markdown; charset=utf-8',
    version: 'v2.1',
    updatedAt: '2026-10-25',
    publishedBy: 'Office of Student Life',
    audienceNote: 'Required for external guests or multi-club panels',
    content: `# Guest Speaker & Multi-Club Co-Sponsorship Proposal

## 1. Participating Organizations
- **Lead Host Club**:
- **Co-Sponsoring Club(s) / Department**:

## 2. Guest Speaker Information
- **Speaker Full Name & Title**:
- **Organization / Affiliation**:
- **Topic & Relevance to CUNY SPS Students**:
- **Recording Permission Confirmed?**: [ ] Yes  [ ] No (Live Only)

## 3. Joint Promotion Plan
- **Official Accounts Posting**:
- **Designated Moderator(s)**:
- **Student Life Approval Reference ID**:
`,
  },
  {
    resourceId: 'res-evt-checklist',
    title: 'Event Run-of-Show & Social Promo Timeline (CSV)',
    category: 'Event Proposal Templates',
    description:
      'Spreadsheet checklist mapping T-14 days through post-event recap across social media, RSVP reminders, and host responsibilities.',
    fileName: 'CUNY_SPS_Event_Run_of_Show_Checklist.csv',
    fileFormat: 'CSV',
    mimeType: 'text/csv; charset=utf-8',
    version: 'v1.5',
    updatedAt: '2026-11-02',
    publishedBy: 'Student Leadership Council',
    audienceNote: 'Opens in Excel or Google Sheets',
    content: `Timeline,Task,Owner Role,Channel / Tool,Completed
T-14 Days,Submit Event Proposal & confirm Faculty Advisor sign-off,President,Student Life Portal,No
T-10 Days,Design WCAG-compliant promotional graphic using CUNY SPS lockup,Social Media Chair,Content Studio,No
T-7 Days,Schedule announcement across Facebook Pages and Instagram Professional,Editor,Content Calendar,No
T-3 Days,Verify Zoom live captioning & co-host permissions,Events Coordinator,Zoom,No
T-1 Day,Publish 24-hour reminder post with RSVP link,Secretary,Social Hub,No
Event Day,Run attendance check-in and capture approved screenshots,Treasurer / Secretary,Zoom / Room,No
T+2 Days,Post event recap & thank-you message to attendees,Social Media Chair,Content Studio,No
`,
  },
  {
    resourceId: 'res-fin-voucher',
    title: 'Student Organization Financial Reimbursement Form',
    category: 'Financial Reimbursement Forms',
    description:
      'Printable & fillable HTML voucher for authorized club officers requesting reimbursement for pre-approved event expenses.',
    fileName: 'CUNY_SPS_Financial_Reimbursement_Form.html',
    fileFormat: 'HTML',
    mimeType: 'text/html; charset=utf-8',
    version: 'FY2026–2027',
    updatedAt: '2026-10-28',
    publishedBy: 'Office of Student Life & Business Office',
    audienceNote: 'Print or save as PDF with original itemized receipts',
    content: `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>CUNY SPS Student Organization Financial Reimbursement Form</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #0F172A; max-width: 820px; margin: 32px auto; padding: 0 20px; line-height: 1.5; }
    .header { border-bottom: 3px solid #004B87; padding-bottom: 12px; margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 20px; color: #004B87; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #475569; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0 24px; font-size: 13px; }
    th, td { border: 1px solid #CBD5E1; padding: 8px 10px; text-align: left; }
    th { background: #F8FAFC; font-weight: 600; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 32px; font-size: 13px; }
    .sig-box { border-top: 1px solid #334155; padding-top: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>CUNY School of Professional Studies — Office of Student Life</h1>
    <p>Student Organization Financial Reimbursement Voucher (FY 2026–2027)</p>
  </div>
  <table>
    <tr><th>Student Club Name</th><td>____________________________________</td><th>Club Short Code</th><td>________________</td></tr>
    <tr><th>Payee Full Name</th><td>____________________________________</td><th>EMPLID (Last 4)</th><td>________________</td></tr>
    <tr><th>CUNY SPS Email</th><td>____________________________________</td><th>Related Event Date</th><td>________________</td></tr>
    <tr><th>Approved Proposal ID</th><td>____________________________________</td><th>Total Claimed ($)</th><td>$_______________</td></tr>
  </table>
  <table>
    <thead>
      <tr><th>Receipt Date</th><th>Vendor / Merchant</th><th>Expense Description</th><th>Category</th><th>Amount ($)</th></tr>
    </thead>
    <tbody>
      <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>
      <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>
      <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>
      <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>
    </tbody>
  </table>
  <p style="font-size:12px;color:#475569;"><strong>Certification:</strong> I certify that all expenses listed above were pre-approved by the student organization and Office of Student Life, are supported by original itemized receipts showing proof of payment, and exclude NY sales tax where CUNY tax-exempt documentation applies.</p>
  <div class="sig-grid">
    <div class="sig-box">Payee Signature &amp; Date</div>
    <div class="sig-box">Club President / Treasurer Signature &amp; Date</div>
    <div class="sig-box">Faculty Advisor Approval &amp; Date</div>
    <div class="sig-box">Office of Student Life Fiscal Review &amp; Date</div>
  </div>
</body>
</html>`,
  },
  {
    resourceId: 'res-fin-ledger',
    title: 'Club Expense Itemization & Receipt Ledger (CSV)',
    category: 'Financial Reimbursement Forms',
    description:
      'Treasurer reconciliation worksheet for tracking pre-approved event expenses, receipt numbers, and reimbursement status.',
    fileName: 'CUNY_SPS_Expense_Itemization_Ledger.csv',
    fileFormat: 'CSV',
    mimeType: 'text/csv; charset=utf-8',
    version: 'v2.0',
    updatedAt: '2026-10-30',
    publishedBy: 'Office of Student Life',
    audienceNote: 'Attach alongside itemized vendor receipts',
    content: `Receipt_Date,Event_Title,Vendor,Expense_Category,Payment_Method,Pre_Approval_Ref,Tax_Excluded_Amount_USD,Status
2026-11-19,AI Club Meeting,Campus Print Shop,Event Flyers & Signage,Club Officer Card,EVT-2026-041,48.50,Pending Review
2026-11-24,AI Club Meeting,Zoom Add-On,Accessibility Captioning,Student Life Direct,EVT-2026-044,0.00,Approved
`,
  },
  {
    resourceId: 'res-fin-guidelines',
    title: 'Financial Reimbursement Policy & Receipt Checklist',
    category: 'Financial Reimbursement Forms',
    description:
      'Guidance on allowable student activity fee purchases, pre-approval rules, itemized receipt requirements, and submission timelines.',
    fileName: 'CUNY_SPS_Reimbursement_Policy_Checklist.md',
    fileFormat: 'MD',
    mimeType: 'text/markdown; charset=utf-8',
    version: 'v2.2',
    updatedAt: '2026-11-03',
    publishedBy: 'Office of Student Life',
    audienceNote: 'Review before purchasing supplies or catering',
    content: `# CUNY SPS Student Organization Reimbursement Policy & Checklist

## 1. Pre-Approval Requirement
- All club expenditures must receive prior written confirmation from the **Office of Student Life** and **Faculty Advisor** before purchase.

## 2. Acceptable Proof of Payment
- Upload **itemized receipts** displaying vendor name, purchase date, individual line items, and final payment method (last 4 digits or "Paid").
- Credit card summary slips without itemized line details cannot be reimbursed.

## 3. Tax-Exempt Guidance & Deadlines
- Obtain the CUNY Tax-Exempt Certificate from Student Life prior to vendor checkout; NY sales tax is generally non-reimbursable.
- Submit completed reimbursement packets within **10 business days** following the event date.
`,
  },
];
