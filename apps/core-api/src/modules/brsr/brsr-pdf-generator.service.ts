import PDFDocument from 'pdfkit';
import { BrsrSectionA, BrsrSectionB, BrsrSectionC, CarbonIQAggregatedMetrics } from './brsr.types';

/**
 * BRSRPdfGeneratorService
 * Renders an industry-grade, deterministic statutory PDF report aligned with SEBI BRSR guidelines:
 * - Clean white A4 pages with zero overlapping elements
 * - Explicit coordinate tracking and robust table bounding boxes
 * - Executive Cover Page, Section A, Section B (P1-P9 matrix), Section C (Principle 6 GHG tables)
 * - Calculation Provenance Annexure
 * - Running headers, thin divider lines, and 'Page X of Y' pagination
 */
export class BRSRPdfGeneratorService {
  /**
   * Generates a binary PDF buffer of the BRSR report.
   */
  async generatePdf(params: {
    financialYear: string;
    organizationName: string;
    sectionA: BrsrSectionA;
    sectionB: BrsrSectionB;
    sectionC: BrsrSectionC;
    carbonMetrics: CarbonIQAggregatedMetrics;
    isAssured: boolean;
    assuranceProvider?: string;
    assuranceType?: string;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 45,
        size: 'A4',
        bufferPages: true,
        info: {
          Title: `BRSR Report ${params.financialYear} — ${params.organizationName}`,
          Author: 'CarbonIQ Sustainability Intelligence Platform',
          Subject: 'Business Responsibility and Sustainability Report (SEBI Format)',
          Keywords: 'BRSR, SEBI, ESG, GHG Protocol, Scope 1, Scope 2, Scope 3, Statutory Disclosure',
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => {
        // Calculate total pages and stamp running headers/footers in second pass
        const range = doc.bufferedPageRange();
        const totalPages = range.count;

        for (let i = 0; i < totalPages; i++) {
          doc.switchToPage(i);

          // Skip running header on cover page (page 0)
          if (i > 0) {
            doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold')
              .text(params.organizationName, 45, 24, { width: 250, lineBreak: false });
            doc.fillColor('#64748b').fontSize(8).font('Helvetica')
              .text(`BRSR Statutory Report ${params.financialYear}`, 300, 24, { width: 250, align: 'right', lineBreak: false });
            doc.strokeColor('#e2e8f0').lineWidth(0.75).moveTo(45, 36).lineTo(550, 36).stroke();
          }

          // Running Footer on every page
          doc.strokeColor('#e2e8f0').lineWidth(0.75).moveTo(45, 800).lineTo(550, 800).stroke();
          doc.fillColor('#64748b').fontSize(8).font('Helvetica')
            .text('Confidential — Prepared with CarbonIQ Compliance Engine', 45, 806, { width: 320, lineBreak: false });
          doc.text(`Page ${i + 1} of ${totalPages}`, 400, 806, { width: 150, align: 'right', lineBreak: false });
        }

        doc.flushPages();
        resolve(Buffer.concat(buffers));
      });
      doc.on('error', (err: Error) => reject(err));

      const accentGreen = '#0f6b3a';
      const textPrimary = '#0f172a';
      const textSecondary = '#64748b';
      const tableHeaderBg = '#f8fafc';
      const borderColor = '#e2e8f0';

      // ─── Drawing Primitives ───────────────────────────────────────────────

      const drawSectionTitle = (sectionLabel: string, sectionTitle: string) => {
        if (doc.y > 680) doc.addPage();
        doc.fillColor(textPrimary).fontSize(11).font('Helvetica-Bold')
          .text(`${sectionLabel} — ${sectionTitle}`.toUpperCase(), 45, doc.y);
        doc.moveDown(0.3);
        doc.strokeColor(accentGreen).lineWidth(1.5).moveTo(45, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.8);
      };

      const drawSubsectionTitle = (title: string) => {
        if (doc.y > 700) doc.addPage();
        doc.fillColor(accentGreen).fontSize(9.5).font('Helvetica-Bold').text(title, 45, doc.y);
        doc.moveDown(0.5);
      };

      const drawTableHeader = (cols: Array<{ label: string; x: number; width: number; align?: 'left' | 'right' | 'center' }>) => {
        if (doc.y > 710) doc.addPage();
        const headerY = doc.y;
        doc.rect(45, headerY, 505, 19).fillAndStroke(tableHeaderBg, borderColor);
        doc.fillColor(textSecondary).fontSize(8).font('Helvetica-Bold');
        cols.forEach((col) => {
          doc.text(col.label, col.x, headerY + 5, {
            width: col.width,
            align: col.align || 'left',
            lineBreak: false,
          });
        });
        doc.y = headerY + 19;
      };

      const drawTableRow = (
        cols: Array<{ text: string; x: number; width: number; align?: 'left' | 'right' | 'center'; font?: string; color?: string }>,
        options?: { isTotal?: boolean; height?: number }
      ) => {
        const rowHeight = options?.height || 18;
        if (doc.y + rowHeight > 750) {
          doc.addPage();
        }
        const rowY = doc.y;
        const bg = options?.isTotal ? '#f1f5f9' : '#ffffff';
        doc.rect(45, rowY, 505, rowHeight).fillAndStroke(bg, borderColor);

        cols.forEach((col) => {
          doc.fillColor(col.color || textPrimary)
            .fontSize(8)
            .font(col.font || (options?.isTotal ? 'Helvetica-Bold' : 'Helvetica'))
            .text(col.text, col.x, rowY + 5, {
              width: col.width,
              align: col.align || 'left',
              lineBreak: false,
            });
        });
        doc.y = rowY + rowHeight;
      };

      const drawKeyValueTable = (rows: Array<{ label: string; value: string | number | undefined | null; indent?: boolean }>) => {
        rows.forEach((r, idx) => {
          if (doc.y + 18 > 750) doc.addPage();

          const currentY = doc.y;
          const bg = idx % 2 === 0 ? '#ffffff' : '#fafafa';
          doc.rect(45, currentY, 505, 18).fillAndStroke(bg, borderColor);

          doc.fillColor(textSecondary).fontSize(8).font('Helvetica')
            .text(r.label, r.indent ? 60 : 52, currentY + 5, { width: 220, lineBreak: false });

          const valStr = r.value !== undefined && r.value !== null && String(r.value).trim() !== ''
            ? String(r.value)
            : '—';

          doc.fillColor(textPrimary).fontSize(8).font('Helvetica')
            .text(valStr, 275, currentY + 5, { width: 270, lineBreak: false });

          doc.y = currentY + 18;
        });
        doc.moveDown(0.8);
      };

      // =========================================================================
      // 1. CORPORATE COVER PAGE (White A4)
      // =========================================================================
      // Top botanical accent bar
      doc.rect(45, 45, 505, 5).fill(accentGreen);

      // Company Initials Emblem Box
      doc.rect(45, 80, 50, 50).fillAndStroke('#f8fafc', borderColor);
      const initials = (params.organizationName || 'CO').slice(0, 2).toUpperCase();
      doc.fillColor(accentGreen).fontSize(18).font('Helvetica-Bold').text(initials, 45, 96, { width: 50, align: 'center', lineBreak: false });

      doc.fillColor(textSecondary).fontSize(10).font('Helvetica-Bold')
        .text(params.organizationName.toUpperCase(), 45, 142);
      if (params.sectionA.entityDetails?.cin) {
        doc.fillColor('#64748b').fontSize(8.5).font('Helvetica')
          .text(`CIN: ${params.sectionA.entityDetails.cin}`, 45, 156);
      }

      // Title Box with Left Accent Line
      doc.strokeColor(accentGreen).lineWidth(3).moveTo(45, 205).lineTo(45, 285).stroke();
      doc.fillColor(textSecondary).fontSize(9).font('Helvetica-Bold')
        .text('STATUTORY DISCLOSURE', 58, 208);
      doc.fillColor(textPrimary).fontSize(22).font('Helvetica-Bold')
        .text('BUSINESS RESPONSIBILITY &\nSUSTAINABILITY REPORT', 58, 222, { lineGap: 3 });
      doc.fillColor(accentGreen).fontSize(14).font('Helvetica-Bold')
        .text(params.financialYear, 58, 274);

      // Key Particulars Table
      doc.y = 320;
      doc.strokeColor(borderColor).lineWidth(0.75).moveTo(45, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.8);

      const ent = params.sectionA.entityDetails || ({} as any);
      drawKeyValueTable([
        { label: 'Reporting Entity', value: params.organizationName },
        { label: 'Corporate Identity Number (CIN)', value: ent.cin || 'Not Disclosed' },
        { label: 'Reporting Boundary', value: `${ent.reportingBoundary || 'STANDALONE'} Basis` },
        { label: 'Registered Office', value: ent.registeredOfficeAddress || 'Corporate Office' },
        { label: 'Regulatory Framework', value: 'SEBI (LODR) Regulations, 2015 — BRSR Format' },
        { label: 'GHG Accounting Standard', value: 'GHG Protocol Corporate Standard (2015) + GLEC' },
        { label: 'Third-Party Assurance', value: params.isAssured ? `Assured by ${params.assuranceProvider}` : 'Not Provided (Internal Organizational Records)' },
      ]);

      // Subtle attribution footnote
      doc.fillColor('#94a3b8').fontSize(8).font('Helvetica-Oblique')
        .text('Prepared using CarbonIQ Sustainability Intelligence Platform', 45, 750);

      // =========================================================================
      // 2. SECTION A: GENERAL DISCLOSURES
      // =========================================================================
      doc.addPage();
      drawSectionTitle('SECTION A', 'GENERAL DISCLOSURES');
      drawSubsectionTitle('I. Details of the Listed Entity');

      drawKeyValueTable([
        { label: '1. Corporate Identity Number (CIN)', value: ent.cin },
        { label: '2. Name of the Listed Entity', value: ent.name || params.organizationName },
        { label: '3. Year of Incorporation', value: ent.yearOfIncorporation },
        { label: '4. Registered Office Address', value: ent.registeredOfficeAddress },
        { label: '5. Corporate Office Address', value: ent.corporateAddress },
        { label: '6. E-mail ID', value: ent.email },
        { label: '7. Telephone Number', value: ent.telephone },
        { label: '8. Website URL', value: ent.website },
        { label: '9. Reporting Financial Year', value: ent.financialYear || params.financialYear },
        { label: '10. Stock Exchange(s) Listed', value: ent.stockExchanges?.join(', ') || 'BSE / NSE' },
        { label: '11. Paid-up Capital', value: ent.paidUpCapital },
        { label: '12. Contact Person for BRSR Queries', value: `${ent.contactPersonName || 'N/A'} (${ent.contactPersonEmail || 'N/A'})` },
        { label: '13. Reporting Boundary', value: `${ent.reportingBoundary || 'STANDALONE'} (Standalone entity disclosures)` },
      ]);

      drawSubsectionTitle('II. Products / Services & Operations');
      if (params.sectionA.businessActivities && params.sectionA.businessActivities.length > 0) {
        params.sectionA.businessActivities.forEach((b) => {
          doc.fillColor(textPrimary).fontSize(8.5).font('Helvetica')
            .text(`• ${b.descriptionMain} — ${b.descriptionBusiness} (${b.turnoverPercentage}% turnover)`, 50, doc.y);
          doc.moveDown(0.2);
        });
        doc.moveDown(0.5);
      }

      const ops = params.sectionA.operations || ({} as any);
      drawKeyValueTable([
        { label: '14. Operational Locations (National)', value: `${ops.nationalPlants || 0} Plants, ${ops.nationalOffices || 0} Offices` },
        { label: '15. Operational Locations (International)', value: `${ops.internationalPlants || 0} Plants, ${ops.internationalOffices || 0} Offices` },
      ]);

      // =========================================================================
      // 3. SECTION B: MANAGEMENT & PROCESS DISCLOSURES
      // =========================================================================
      doc.addPage();
      drawSectionTitle('SECTION B', 'MANAGEMENT AND PROCESS DISCLOSURES');
      drawSubsectionTitle('I. Policy and Management Processes (NGRBC Principles 1–9)');

      const pol = params.sectionB.policyCoverage || ({} as any);
      const pList = [
        { key: 'P1', name: 'Ethics, Transparency & Accountability', val: pol.p1Ethics },
        { key: 'P2', name: 'Sustainable & Safe Goods & Services', val: pol.p2Sustainability },
        { key: 'P3', name: 'Employee & Worker Well-being', val: pol.p3Employees },
        { key: 'P4', name: 'Stakeholder Responsiveness', val: pol.p4Stakeholders },
        { key: 'P5', name: 'Human Rights Protection', val: pol.p5HumanRights },
        { key: 'P6', name: 'Environmental Protection & Restoration', val: pol.p6Environment },
        { key: 'P7', name: 'Responsible Public Policy Engagement', val: pol.p7PublicPolicy },
        { key: 'P8', name: 'Inclusive Growth & Development', val: pol.p8InclusiveGrowth },
        { key: 'P9', name: 'Consumer Value & Engagement', val: pol.p9ConsumerValue },
      ];

      drawTableHeader([
        { label: 'Principle', x: 52, width: 55 },
        { label: 'Description', x: 110, width: 335 },
        { label: 'Policy in Place?', x: 455, width: 90, align: 'center' },
      ]);

      pList.forEach((p) => {
        drawTableRow([
          { text: p.key, x: 52, width: 55, font: 'Helvetica-Bold' },
          { text: p.name, x: 110, width: 335 },
          { text: p.val ? 'Y' : 'N', x: 455, width: 90, align: 'center', font: 'Helvetica-Bold', color: p.val ? '#047857' : '#64748b' },
        ]);
      });

      doc.moveDown(0.8);
      drawSubsectionTitle('II. Governance, Leadership and Oversight');
      drawKeyValueTable([
        { label: 'Board Approved Sustainability Policies', value: params.sectionB.boardApproved ? 'Yes' : 'Under Review' },
        { label: 'Director Statement for BRSR', value: params.sectionB.directorStatement || 'Committed to ethical governance and carbon transparency.' },
        { label: 'Highest Responsible Authority', value: `${params.sectionB.highestResponsibleAuthority?.name || 'Managing Director'} (${params.sectionB.highestResponsibleAuthority?.designation || 'Leadership'})` },
        { label: 'Third-Party Assurance', value: params.isAssured ? `Assured by ${params.assuranceProvider}` : 'Not Provided' },
      ]);

      // =========================================================================
      // 4. SECTION C: PRINCIPLE 6 (ENVIRONMENT & GREENHOUSE GASES)
      // =========================================================================
      doc.addPage();
      drawSectionTitle('SECTION C', 'PRINCIPLE-WISE PERFORMANCE DISCLOSURES');
      drawSubsectionTitle('PRINCIPLE 6: ENVIRONMENTAL PROTECTION & RESTORATION');

      const cMetrics = params.carbonMetrics || ({} as any);

      // Essential Indicator 4: GHG Scope 1 & Scope 2 Title
      doc.fillColor(textPrimary).fontSize(8.5).font('Helvetica-Bold')
        .text('Essential Indicator 4: Greenhouse Gas (GHG) Scope 1 & Scope 2 Emissions', 45, doc.y);
      doc.moveDown(0.4);

      // Table Header (Exact coordinate alignment)
      drawTableHeader([
        { label: 'Parameter / Category', x: 52, width: 250 },
        { label: 'Unit', x: 310, width: 90 },
        { label: `Current FY (${params.financialYear})`, x: 405, width: 140, align: 'right' },
      ]);

      const formatNum = (numVal: number) =>
        (numVal ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

      drawTableRow([
        { text: 'Total Scope 1 Emissions (Direct)', x: 52, width: 250, font: 'Helvetica-Bold' },
        { text: 'tCO2e', x: 310, width: 90, color: textSecondary },
        { text: formatNum(cMetrics.scope1?.totalTonnes), x: 405, width: 140, align: 'right', font: 'Helvetica-Bold', color: accentGreen },
      ]);

      drawTableRow([
        { text: '   • Stationary combustion (Fuel / Generators)', x: 52, width: 250 },
        { text: 'tCO2e', x: 310, width: 90, color: textSecondary },
        { text: formatNum(cMetrics.scope1?.stationaryCombustion?.co2eTonnes), x: 405, width: 140, align: 'right' },
      ]);

      drawTableRow([
        { text: '   • Mobile fleet combustion', x: 52, width: 250 },
        { text: 'tCO2e', x: 310, width: 90, color: textSecondary },
        { text: formatNum(cMetrics.scope1?.mobileCombustion?.co2eTonnes), x: 405, width: 140, align: 'right' },
      ]);

      drawTableRow([
        { text: 'Total Scope 2 Emissions (Location-based)', x: 52, width: 250 },
        { text: 'tCO2e', x: 310, width: 90, color: textSecondary },
        { text: formatNum(cMetrics.scope2?.totalLocationTonnes), x: 405, width: 140, align: 'right' },
      ]);

      drawTableRow([
        { text: 'Total Scope 2 Emissions (Market-based)', x: 52, width: 250 },
        { text: 'tCO2e', x: 310, width: 90, color: textSecondary },
        { text: formatNum(cMetrics.scope2?.totalMarketTonnes), x: 405, width: 140, align: 'right' },
      ]);

      drawTableRow([
        { text: 'Total Scope 1 + Scope 2 Emissions', x: 52, width: 250, font: 'Helvetica-Bold' },
        { text: 'tCO2e', x: 310, width: 90, color: textSecondary },
        { text: formatNum(cMetrics.totalScope1And2Tonnes), x: 405, width: 140, align: 'right', font: 'Helvetica-Bold', color: accentGreen },
      ], { isTotal: true });

      doc.moveDown(0.9);

      // Essential Indicator 5: Scope 3
      doc.fillColor(textPrimary).fontSize(8.5).font('Helvetica-Bold')
        .text('Essential Indicator 5: Scope 3 Value Chain GHG Emissions (GLEC / GHG Protocol)', 45, doc.y);
      doc.moveDown(0.4);

      drawTableHeader([
        { label: 'Scope 3 Category', x: 52, width: 250 },
        { label: 'Unit', x: 310, width: 90 },
        { label: `Current FY (${params.financialYear})`, x: 405, width: 140, align: 'right' },
      ]);

      drawTableRow([
        { text: 'Total Scope 3 Emissions', x: 52, width: 250, font: 'Helvetica-Bold' },
        { text: 'tCO2e', x: 310, width: 90, color: textSecondary },
        { text: formatNum(cMetrics.scope3?.totalTonnes), x: 405, width: 140, align: 'right', font: 'Helvetica-Bold', color: accentGreen },
      ]);

      drawTableRow([
        { text: '   • Upstream freight transportation', x: 52, width: 250 },
        { text: 'tCO2e', x: 310, width: 90, color: textSecondary },
        { text: formatNum(cMetrics.scope3?.upstreamTransport?.co2eTonnes), x: 405, width: 140, align: 'right' },
      ]);

      drawTableRow([
        { text: '   • Purchased goods & services', x: 52, width: 250 },
        { text: 'tCO2e', x: 310, width: 90, color: textSecondary },
        { text: formatNum(cMetrics.scope3?.purchasedGoods?.co2eTonnes), x: 405, width: 140, align: 'right' },
      ]);

      drawTableRow([
        { text: 'Grand Total Organizational Emissions (Scope 1 + 2 + 3)', x: 52, width: 250, font: 'Helvetica-Bold' },
        { text: 'tCO2e', x: 310, width: 90, color: textSecondary },
        { text: formatNum(cMetrics.grandTotalTonnes), x: 405, width: 140, align: 'right', font: 'Helvetica-Bold', color: accentGreen },
      ], { isTotal: true });

      // Footnote
      doc.moveDown(0.5);
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Oblique')
        .text('Source: CarbonIQ carbon accounting ledger. Methodology: GHG Protocol Corporate Standard & GLEC Framework v3.', 45, doc.y);

      // =========================================================================
      // 5. ANNEXURE: CALCULATION PROVENANCE
      // =========================================================================
      doc.addPage();
      drawSectionTitle('ANNEXURE', 'TRANSACTIONAL CALCULATION PROVENANCE');
      doc.fillColor(textSecondary).fontSize(8).font('Helvetica')
        .text('Underlying invoice records and emission factor citations for Principle 6 disclosures.', 45, doc.y);
      doc.moveDown(0.6);

      const prov = cMetrics.provenance || [];
      if (prov.length > 0) {
        drawTableHeader([
          { label: 'Document Source', x: 52, width: 140 },
          { label: 'Activity Details', x: 198, width: 120 },
          { label: 'Factor Source', x: 324, width: 120 },
          { label: 'Emissions (tCO2e)', x: 450, width: 95, align: 'right' },
        ]);

        prov.slice(0, 20).forEach((p: any) => {
          drawTableRow([
            { text: p.documentFileName || 'Invoice Record', x: 52, width: 140 },
            { text: `${p.activityValue} ${p.activityUnit || ''}`, x: 198, width: 120, color: textSecondary },
            { text: `${p.factorSource} @ ${p.factorValue}`, x: 324, width: 120, color: textSecondary },
            { text: Number(p.co2eTonnes ?? 0).toFixed(4), x: 450, width: 95, align: 'right', font: 'Helvetica-Bold' },
          ], { height: 16 });
        });
      }

      doc.end();
    });
  }
}
