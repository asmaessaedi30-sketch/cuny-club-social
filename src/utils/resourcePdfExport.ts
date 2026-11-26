import { jsPDF } from 'jspdf';
import type {
  Club,
  ClubBudgetSummary,
  ClubCharterRenewalSummary,
  ClubEngagementFunnel,
  ClubResource,
  ResourceSubmission,
} from '../types';

export interface EventProposalPdfInput {
  clubName: string;
  clubShortCode: string;
  officerName: string;
  officerTitle: string;
  officerEmail: string;
  facultyAdvisor: string;
  eventTitle: string;
  eventFormat: 'Virtual (Zoom)' | 'Hybrid' | 'In-Person (119 W 31st St)';
  proposedDateTime: string;
  expectedAttendance: string;
  missionAlignment: string;
  captioningPlan: string;
  altTextPrepared: boolean;
  estimatedCost: string;
  fundingSource: 'Student Activity Fee Allocation' | 'Zero-Cost Event';
  budgetBreakdown: string;
}

export interface ReimbursementLineItem {
  receiptDate: string;
  vendor: string;
  description: string;
  category: string;
  amount: string;
}

export interface ReimbursementPdfInput {
  clubName: string;
  clubShortCode: string;
  payeeName: string;
  emplidLast4: string;
  payeeEmail: string;
  eventDate: string;
  approvedProposalId: string;
  items: ReimbursementLineItem[];
}

const CUNY_BLUE: [number, number, number] = [0, 75, 135];
const SLATE_900: [number, number, number] = [15, 23, 42];
const SLATE_600: [number, number, number] = [71, 85, 105];
const SLATE_200: [number, number, number] = [226, 232, 240];
const SLATE_50: [number, number, number] = [248, 250, 252];

function drawInstitutionalHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  metaRight: string
): number {
  const pageW = doc.internal.pageSize.getWidth();
  // Top Royal Blue Banner
  doc.setFillColor(...CUNY_BLUE);
  doc.rect(0, 0, pageW, 68, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('CUNY School of Professional Studies', 40, 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(224, 242, 254);
  doc.text('Office of Student Life · Student Organizations Governance', 40, 46);

  doc.setFontSize(8.5);
  doc.text(metaRight, pageW - 40, 46, { align: 'right' });

  // Document Heading
  doc.setTextColor(...SLATE_900);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(title, 40, 96);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...SLATE_600);
  doc.text(subtitle, 40, 113);

  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(1);
  doc.line(40, 124, pageW - 40, 124);

  return 142;
}

function drawFooterAllPages(doc: jsPDF, documentCode: string): void {
  const totalPages = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const generatedStamp = new Date().toISOString().slice(0, 10);

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...SLATE_200);
    doc.setLineWidth(0.75);
    doc.line(40, pageH - 42, pageW - 40, pageH - 42);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...SLATE_600);
    doc.text(
      `CUNY SPS Club Social Hub · ${documentCode} · Generated ${generatedStamp}`,
      40,
      pageH - 26
    );
    doc.text(`Page ${p} of ${totalPages}`, pageW - 40, pageH - 26, { align: 'right' });
  }
}

function ensureSpace(doc: jsPDF, currentY: number, neededHeight: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (currentY + neededHeight > pageH - 58) {
    doc.addPage();
    return 52;
  }
  return currentY;
}

function drawSectionHeading(doc: jsPDF, y: number, heading: string): number {
  const pageW = doc.internal.pageSize.getWidth();
  let nextY = ensureSpace(doc, y, 42);
  doc.setFillColor(...SLATE_50);
  doc.setDrawColor(...SLATE_200);
  doc.rect(40, nextY, pageW - 80, 22, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...CUNY_BLUE);
  doc.text(heading, 48, nextY + 14.5);
  return nextY + 32;
}

function drawKeyValueRow(
  doc: jsPDF,
  y: number,
  label: string,
  value: string,
  isMultiline = false
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const valueX = 205;
  const maxWidth = pageW - 40 - valueX;
  const displayValue = value.trim() || '________________________________________';
  const lines = doc.splitTextToSize(displayValue, maxWidth) as string[];
  const rowHeight = Math.max(18, lines.length * 13 + 6);
  const nextY = ensureSpace(doc, y, rowHeight + 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...SLATE_600);
  doc.text(label, 48, nextY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...SLATE_900);
  doc.text(lines, valueX, nextY + 10);

  if (isMultiline || lines.length > 1) {
    doc.setDrawColor(241, 245, 249);
    doc.line(48, nextY + rowHeight - 2, pageW - 48, nextY + rowHeight - 2);
  }
  return nextY + rowHeight + 2;
}

function drawSignatureGrid(doc: jsPDF, y: number, labels: string[]): number {
  const pageW = doc.internal.pageSize.getWidth();
  const rows = Math.ceil(labels.length / 2);
  let nextY = ensureSpace(doc, y, rows * 52 + 12);
  const colW = (pageW - 80 - 28) / 2;

  for (let i = 0; i < labels.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 40 + col * (colW + 28);
    const lineY = nextY + 28 + row * 52;

    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.75);
    doc.line(x, lineY, x + colW, lineY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...SLATE_600);
    doc.text(labels[i], x, lineY + 12);
  }

  return nextY + rows * 52 + 8;
}

export function buildEventProposalPdf(input: EventProposalPdfInput): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  let y = drawInstitutionalHeader(
    doc,
    'Student Organization Event Proposal Packet',
    'Submit at least 15 business days prior to event · Office of Student Life Approval Form',
    'Form EVT-2026-2027'
  );

  y = drawSectionHeading(doc, y, 'Section A · Organization & Submitting Officer Details');
  y = drawKeyValueRow(
    doc,
    y,
    'Club / Organization',
    input.clubShortCode ? `${input.clubName} (${input.clubShortCode})` : input.clubName
  );
  y = drawKeyValueRow(
    doc,
    y,
    'Submitting Officer',
    input.officerTitle ? `${input.officerName} — ${input.officerTitle}` : input.officerName
  );
  y = drawKeyValueRow(doc, y, 'Institutional Email', input.officerEmail);
  y = drawKeyValueRow(doc, y, 'Faculty Advisor', input.facultyAdvisor);
  y += 8;

  y = drawSectionHeading(doc, y, 'Section B · Event Overview & Student Engagement Scope');
  y = drawKeyValueRow(doc, y, 'Proposed Event Title', input.eventTitle, true);
  y = drawKeyValueRow(doc, y, 'Event Format', input.eventFormat);
  y = drawKeyValueRow(doc, y, 'Proposed Date & Time (ET)', input.proposedDateTime);
  y = drawKeyValueRow(doc, y, 'Expected Attendance', input.expectedAttendance);
  y = drawKeyValueRow(doc, y, 'Mission Alignment & Goals', input.missionAlignment, true);
  y += 8;

  y = drawSectionHeading(doc, y, 'Section C · Accessibility & Inclusion Compliance');
  y = drawKeyValueRow(doc, y, 'Captioning / ASL Plan', input.captioningPlan, true);
  y = drawKeyValueRow(
    doc,
    y,
    'WCAG Alt-Text Prepared',
    input.altTextPrepared
      ? '[X] Yes — Promotional media includes descriptive alt-text & CamelCase hashtags'
      : '[ ] Pending — Will finalize prior to Content Studio scheduling'
  );
  y += 8;

  y = drawSectionHeading(doc, y, 'Section D · Budget & Vendor Summary');
  y = drawKeyValueRow(doc, y, 'Estimated Total Cost ($)', input.estimatedCost || '$0.00');
  y = drawKeyValueRow(doc, y, 'Funding Source', input.fundingSource);
  y = drawKeyValueRow(doc, y, 'Itemized Breakdown', input.budgetBreakdown, true);
  y += 10;

  y = drawSectionHeading(doc, y, 'Section E · Officer & Institutional Endorsement');
  drawSignatureGrid(doc, y, [
    'Club President / Submitting Officer Signature & Date',
    'Faculty Advisor Endorsement & Date',
    'Office of Student Life Program Review & Date',
    'Fiscal / Facilities Sign-Off (If Applicable) & Date',
  ]);

  drawFooterAllPages(doc, 'Event Proposal Form');
  return doc;
}

export function exportEventProposalPdf(input: EventProposalPdfInput): string {
  const doc = buildEventProposalPdf(input);
  const slug = (input.clubShortCode || 'CUNY_SPS')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .toUpperCase();
  const fileName = `${slug}_Event_Proposal_Form.pdf`;
  doc.save(fileName);
  return fileName;
}

export function buildReimbursementPdf(input: ReimbursementPdfInput): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();

  let y = drawInstitutionalHeader(
    doc,
    'Student Organization Financial Reimbursement Voucher',
    'FY 2026–2027 · Submit within 10 business days of event with original itemized receipts',
    'Form FIN-VOUCHER-FY27'
  );

  y = drawSectionHeading(doc, y, 'Payee & Organization Verification');
  y = drawKeyValueRow(
    doc,
    y,
    'Student Club Name',
    input.clubShortCode ? `${input.clubName} (${input.clubShortCode})` : input.clubName
  );
  y = drawKeyValueRow(doc, y, 'Payee Full Name', input.payeeName);
  y = drawKeyValueRow(doc, y, 'EMPLID (Last 4 Digits)', input.emplidLast4);
  y = drawKeyValueRow(doc, y, 'CUNY SPS Email', input.payeeEmail);
  y = drawKeyValueRow(doc, y, 'Related Event Date', input.eventDate);
  y = drawKeyValueRow(doc, y, 'Approved Proposal ID', input.approvedProposalId);
  y += 8;

  y = drawSectionHeading(doc, y, 'Itemized Expense Schedule');

  // Table header
  const colWidths = [74, 118, 174, 96, 70]; // Total = 532 (pageW 612 - 80 = 532)
  const headers = ['Receipt Date', 'Vendor / Merchant', 'Expense Description', 'Category', 'Amount ($)'];
  const startX = 40;

  y = ensureSpace(doc, y, 54);
  doc.setFillColor(...CUNY_BLUE);
  doc.rect(startX, y, pageW - 80, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);

  let cx = startX;
  headers.forEach((h, idx) => {
    if (idx === 4) {
      doc.text(h, cx + colWidths[idx] - 6, y + 14, { align: 'right' });
    } else {
      doc.text(h, cx + 6, y + 14);
    }
    cx += colWidths[idx];
  });
  y += 22;

  const rowsToRender: ReimbursementLineItem[] =
    input.items.length > 0
      ? input.items
      : [
          { receiptDate: '', vendor: '', description: '', category: '', amount: '' },
          { receiptDate: '', vendor: '', description: '', category: '', amount: '' },
          { receiptDate: '', vendor: '', description: '', category: '', amount: '' },
          { receiptDate: '', vendor: '', description: '', category: '', amount: '' },
        ];

  let totalAmount = 0;
  for (const row of rowsToRender) {
    const parsedNum = Number(String(row.amount).replace(/[^0-9.-]/g, ''));
    if (Number.isFinite(parsedNum) && parsedNum > 0) {
      totalAmount += parsedNum;
    }

    const descLines = doc.splitTextToSize(row.description || ' ', colWidths[2] - 10) as string[];
    const rowH = Math.max(22, descLines.length * 12 + 8);
    y = ensureSpace(doc, y, rowH + 6);

    doc.setDrawColor(...SLATE_200);
    doc.rect(startX, y, pageW - 80, rowH, 'S');

    let rx = startX;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...SLATE_900);

    doc.text((row.receiptDate || '').slice(0, 14), rx + 6, y + 14);
    rx += colWidths[0];

    const vendorLines = doc.splitTextToSize(row.vendor || ' ', colWidths[1] - 10) as string[];
    doc.text(vendorLines[0] ?? '', rx + 6, y + 14);
    rx += colWidths[1];

    doc.text(descLines, rx + 6, y + 14);
    rx += colWidths[2];

    const catLines = doc.splitTextToSize(row.category || ' ', colWidths[3] - 10) as string[];
    doc.text(catLines[0] ?? '', rx + 6, y + 14);
    rx += colWidths[3];

    const amountText =
      Number.isFinite(parsedNum) && row.amount.trim() !== '' ? `$${parsedNum.toFixed(2)}` : '';
    doc.text(amountText, rx + colWidths[4] - 6, y + 14, { align: 'right' });

    y += rowH;
  }

  // Total Claimed Summary Row
  y = ensureSpace(doc, y, 28);
  doc.setFillColor(...SLATE_50);
  doc.setDrawColor(...SLATE_200);
  doc.rect(startX, y, pageW - 80, 24, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...SLATE_900);
  doc.text('Total Claimed Reimbursement ($ USD)', startX + 8, y + 15.5);
  doc.setTextColor(...CUNY_BLUE);
  doc.text(
    totalAmount > 0 ? `$${totalAmount.toFixed(2)}` : '$____________',
    pageW - 46,
    y + 15.5,
    { align: 'right' }
  );
  y += 38;

  // Certification
  y = ensureSpace(doc, y, 64);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...SLATE_900);
  doc.text('Payee Certification & Tax-Exempt Compliance:', 40, y);
  y += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE_600);
  const certText =
    'I certify that all expenses listed above were pre-approved by the recognized student organization and the CUNY SPS Office of Student Life, are supported by original itemized vendor receipts showing proof of payment, and exclude NY sales tax where CUNY tax-exempt documentation applies.';
  const certLines = doc.splitTextToSize(certText, pageW - 80) as string[];
  doc.text(certLines, 40, y);
  y += certLines.length * 12 + 12;

  drawSignatureGrid(doc, y, [
    'Payee Signature & Date',
    'Club President / Treasurer Signature & Date',
    'Faculty Advisor Approval & Date',
    'Office of Student Life Fiscal Review & Date',
  ]);

  drawFooterAllPages(doc, 'Financial Reimbursement Voucher');
  return doc;
}

export function exportReimbursementPdf(input: ReimbursementPdfInput): string {
  const doc = buildReimbursementPdf(input);
  const slug = (input.clubShortCode || 'CUNY_SPS')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .toUpperCase();
  const fileName = `${slug}_Financial_Reimbursement_Form.pdf`;
  doc.save(fileName);
  return fileName;
}

function stripMarkdownTokens(line: string): string {
  return line
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*]\s+/, '• ');
}

export function exportResourceTemplateAsPdf(
  resource: ClubResource,
  rawContent: string,
  club?: Club,
  officerName?: string,
  officerEmail?: string
): string {
  // Use rich structured PDF layout for primary Event Proposal & Financial Reimbursement Voucher forms
  if (resource.resourceId === 'res-evt-proposal') {
    return exportEventProposalPdf({
      clubName: club?.name ?? '',
      clubShortCode: club?.shortCode ?? '',
      officerName: officerName ?? '',
      officerTitle: 'Club Leader',
      officerEmail: officerEmail ?? '',
      facultyAdvisor: club?.facultyAdvisor ?? '',
      eventTitle: '',
      eventFormat: 'Virtual (Zoom)',
      proposedDateTime: '',
      expectedAttendance: '',
      missionAlignment: '',
      captioningPlan: '[ ] Zoom Auto-Captions + Transcript Requested',
      altTextPrepared: false,
      estimatedCost: '',
      fundingSource: 'Student Activity Fee Allocation',
      budgetBreakdown: '',
    });
  }

  if (resource.resourceId === 'res-fin-voucher') {
    return exportReimbursementPdf({
      clubName: club?.name ?? '',
      clubShortCode: club?.shortCode ?? '',
      payeeName: officerName ?? '',
      emplidLast4: '',
      payeeEmail: officerEmail ?? '',
      eventDate: '',
      approvedProposalId: '',
      items: [],
    });
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = drawInstitutionalHeader(
    doc,
    resource.title,
    `${resource.category} · ${resource.publishedBy} · ${resource.audienceNote}`,
    `${resource.version} · Updated ${resource.updatedAt}`
  );

  if (club) {
    y = drawKeyValueRow(doc, y, 'Prepared For Club', `${club.name} (${club.shortCode})`);
    if (officerName) {
      y = drawKeyValueRow(
        doc,
        y,
        'Prepared By',
        officerEmail ? `${officerName} (${officerEmail})` : officerName
      );
    }
    y += 10;
  }

  if (resource.fileFormat === 'CSV') {
    const lines = rawContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const parsedRows = lines.map((line) => line.split(',').map((cell) => cell.trim()));
    if (parsedRows.length > 0) {
      const headers = parsedRows[0];
      const colCount = headers.length;
      const colW = (pageW - 80) / Math.max(colCount, 1);

      y = ensureSpace(doc, y, 40);
      doc.setFillColor(...CUNY_BLUE);
      doc.rect(40, y, pageW - 80, 22, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      headers.forEach((h, i) => {
        const text = doc.splitTextToSize(h.replace(/_/g, ' '), colW - 8) as string[];
        doc.text(text[0] ?? '', 40 + i * colW + 4, y + 14);
      });
      y += 22;

      for (let r = 1; r < parsedRows.length; r++) {
        const row = parsedRows[r];
        const cellLines = row.map((cell) => doc.splitTextToSize(cell || ' ', colW - 8) as string[]);
        const maxLines = Math.max(...cellLines.map((c) => c.length), 1);
        const rowH = Math.max(20, maxLines * 11 + 8);
        y = ensureSpace(doc, y, rowH + 4);

        doc.setDrawColor(...SLATE_200);
        doc.rect(40, y, pageW - 80, rowH, 'S');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...SLATE_900);
        cellLines.forEach((linesForCell, i) => {
          doc.text(linesForCell, 40 + i * colW + 4, y + 13);
        });
        y += rowH;
      }
    }
  } else {
    const lines = rawContent.split(/\r?\n/);
    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) {
        y += 6;
        continue;
      }
      if (trimmed.startsWith('# ')) {
        // Already rendered in document banner
        continue;
      }
      if (trimmed.startsWith('## ')) {
        y += 4;
        y = drawSectionHeading(doc, y, trimmed.replace(/^##\s+/, ''));
        continue;
      }
      const cleanLine = stripMarkdownTokens(trimmed);
      const wrapped = doc.splitTextToSize(cleanLine, pageW - 88) as string[];
      const blockH = wrapped.length * 13 + 4;
      y = ensureSpace(doc, y, blockH);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...SLATE_900);
      doc.text(wrapped, 44, y + 10);
      y += blockH;
    }
  }

  drawFooterAllPages(doc, resource.title);
  const pdfFileName = resource.fileName.replace(/\.(md|csv|html)$/i, '') + '.pdf';
  doc.save(pdfFileName);
  return pdfFileName;
}

export function exportCharterRenewalPdf(dossier: ClubCharterRenewalSummary): string {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = drawInstitutionalHeader(
    doc,
    'Student Life Annual Club Charter Renewal Dossier',
    `${dossier.clubName} (${dossier.clubShortCode}) · ${dossier.semesterLabel}`,
    `${dossier.clubShortCode} · Charter Renewal`
  );

  y = drawSectionHeading(doc, y, '1. Club Standing & Faculty Supervision');
  y = drawKeyValueRow(doc, y, 'Organization', `${dossier.clubName} (${dossier.clubShortCode})`);
  y = drawKeyValueRow(doc, y, 'Category / Status', `${dossier.category} · ${dossier.status}`);
  y = drawKeyValueRow(doc, y, 'Faculty Advisor', dossier.facultyAdvisor);
  y = drawKeyValueRow(
    doc,
    y,
    'Roster Headcount',
    `${dossier.activeMembersCount} active member(s) · ${dossier.alumniMembersCount} alumni archived`
  );
  y += 8;

  y = drawSectionHeading(doc, y, '2. Verified Officer Leadership Roster');
  for (const off of dossier.officers) {
    y = drawKeyValueRow(doc, y, off.officerTitle, `${off.name} (${off.email || off.role})`);
  }
  if (dossier.officers.length === 0) {
    y = drawKeyValueRow(doc, y, 'Officers', 'No active officer roles recorded');
  }
  y += 8;

  y = drawSectionHeading(doc, y, '3. Semester Event Attendance & Engagement');
  y = drawKeyValueRow(doc, y, 'Events Hosted', `${dossier.eventsHostedCount} event(s) / meetings`);
  y = drawKeyValueRow(
    doc,
    y,
    'Semester Attendance',
    `${dossier.totalSemesterAttendance} total attendees (${dossier.avgAttendanceRatePct}% RSVP conversion)`
  );
  y = drawKeyValueRow(
    doc,
    y,
    'Satisfaction Pulse',
    dossier.avgEventSatisfaction !== null
      ? `${dossier.avgEventSatisfaction.toFixed(1)} / 5.0 average rating`
      : 'No feedback responses recorded yet'
  );
  y = drawKeyValueRow(
    doc,
    y,
    'Social Governance',
    `${dossier.healthySocialAccountsCount}/${dossier.connectedSocialAccountsCount} healthy account(s) · ${dossier.publishedPostsCount} published post(s) · ${dossier.auditComplianceRatePct}% audit compliance`
  );
  y += 8;

  y = drawSectionHeading(doc, y, '4. Student Activity Fee Budget Ledger');
  const b = dossier.budgetSummary;
  y = drawKeyValueRow(doc, y, 'Annual Allocation Cap', `$${b.allocatedUsd.toFixed(2)}`);
  y = drawKeyValueRow(doc, y, 'Encumbered (Proposals)', `$${b.encumberedUsd.toFixed(2)}`);
  y = drawKeyValueRow(doc, y, 'Reimbursed (Approved)', `$${b.reimbursedUsd.toFixed(2)}`);
  y = drawKeyValueRow(doc, y, 'Remaining Balance', `$${b.remainingUsd.toFixed(2)}`);
  y = drawKeyValueRow(
    doc,
    y,
    'Resource Packets',
    `${dossier.resourceSubmissionsCount} total submission(s) (${dossier.approvedReimbursementsCount} approved reimbursements)`
  );
  y += 12;

  y = ensureSpace(doc, y, 80);
  y = drawSectionHeading(doc, y, '5. Institutional Re-Registration Attestation');
  drawSignatureGrid(doc, y, [
    `Club President (${dossier.officers[0]?.name ?? 'Lead Officer'})`,
    `Faculty Advisor (${dossier.facultyAdvisor})`,
    'Director of Student Life (CUNY SPS)',
  ]);

  drawFooterAllPages(doc, `${dossier.clubShortCode} Annual Charter Renewal Dossier`);
  const safeCode = dossier.clubShortCode.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const filename = `cuny-sps-${safeCode}-charter-renewal-2026-27.pdf`;
  void pageW;
  doc.save(filename);
  return filename;
}

export interface ExecutiveDigestPdfInput {
  summary: {
    participatingClubs: number;
    totalClubs: number;
    connectedAccounts: number;
    pendingRequests: number;
    activeClubLeaders: number;
    securityAlerts: number;
  };
  budgetLedgers: ClubBudgetSummary[];
  resourceSubmissions: ResourceSubmission[];
  engagementFunnel?: ClubEngagementFunnel;
  totalPosts: number;
  publishedPosts: number;
  failedPosts: number;
  generatedByName: string;
}

export function exportExecutiveDigestPdf(input: ExecutiveDigestPdfInput): string {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  let y = drawInstitutionalHeader(
    doc,
    'Office of Student Life — Executive Governance & Budget Digest',
    `Generated by ${input.generatedByName} · CUNY School of Professional Studies`,
    'Executive Governance Digest'
  );

  y = drawSectionHeading(doc, y, '1. Pilot Program & Publishing KPIs');
  y = drawKeyValueRow(
    doc,
    y,
    'Active Student Clubs',
    `${input.summary.participatingClubs} active of ${input.summary.totalClubs} recognized organizations`
  );
  y = drawKeyValueRow(
    doc,
    y,
    'Official Social Accounts',
    `${input.summary.connectedAccounts} connected (${input.summary.securityAlerts} open security/token alerts)`
  );
  y = drawKeyValueRow(
    doc,
    y,
    'Publishing Performance',
    `${input.publishedPosts} published / ${input.totalPosts} total posts (${input.failedPosts} failed)`
  );
  y = drawKeyValueRow(
    doc,
    y,
    'Governance Queue',
    `${input.summary.pendingRequests} open account request(s) · ${input.summary.activeClubLeaders} active club lead(s)`
  );
  y += 8;

  if (input.engagementFunnel) {
    const f = input.engagementFunnel;
    y = drawSectionHeading(doc, y, '2. Campus Engagement Funnel (Reach -> Join)');
    y = drawKeyValueRow(
      doc,
      y,
      'Social Funnel',
      `${f.socialReach.toLocaleString()} Reach -> ${f.socialEngagements.toLocaleString()} Engagements`
    );
    y = drawKeyValueRow(
      doc,
      y,
      'Event Conversion',
      `${f.eventRsvps} RSVPs -> ${f.verifiedCheckIns} Verified Attendees`
    );
    y = drawKeyValueRow(
      doc,
      y,
      'Membership Intake',
      `${f.joinRequestsSubmitted} Join Requests -> ${f.newMembersApproved} Approved Members`
    );
    y += 8;
  }

  y = drawSectionHeading(doc, y, '3. Club Student Activity Fee Budget Ledgers');
  for (const b of input.budgetLedgers) {
    y = drawKeyValueRow(
      doc,
      y,
      `${b.clubShortCode}`,
      `Allocated $${b.allocatedUsd.toFixed(2)} | Encumbered $${b.encumberedUsd.toFixed(2)} | Reimbursed $${b.reimbursedUsd.toFixed(2)} | Remaining $${b.remainingUsd.toFixed(2)}`
    );
  }
  y += 8;

  y = drawSectionHeading(doc, y, '4. Recent Event Proposal & Financial Submissions');
  const recentSubs = input.resourceSubmissions.slice(0, 12);
  if (recentSubs.length === 0) {
    y = drawKeyValueRow(doc, y, 'Submissions', 'No financial or event proposal packets recorded.');
  } else {
    for (const sub of recentSubs) {
      const amt = typeof sub.amountUsd === 'number' ? `$${sub.amountUsd.toFixed(2)}` : '$0.00';
      y = drawKeyValueRow(
        doc,
        y,
        `${sub.submissionId} (${sub.clubShortCode})`,
        `${sub.type} · ${sub.status} · ${amt} — ${sub.title}`
      );
    }
  }

  drawFooterAllPages(doc, 'CUNY SPS Student Life Executive Digest');
  const filename = `cuny-sps-student-life-executive-digest-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  return filename;
}

