const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// ── Generate Complex Scope 2 Utility Bill ─────────────────────────────────────
function generateScope2Bill() {
  const doc = new PDFDocument({ margin: 50, compress: false });
  const outputPath = path.join(__dirname, 'complex_scope2_utility_bill.pdf');
  const stream = fs.createWriteStream(outputPath);

  doc.pipe(stream);

  // Title & Header
  doc.fillColor('#1E3A8A').fontSize(20).text('PACIFIC POWER & CLEAN GRID CORP', { align: 'center' });
  doc.fontSize(9).fillColor('#64748B').text('Suite 400, Clean Energy Tower, San Francisco, CA', { align: 'center' });
  doc.moveDown(1.5);

  // Line
  doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(1);

  doc.fillColor('#0F172A').fontSize(13).text('MULTI-METER COMMERCIAL INVOICE', { underline: true });
  doc.moveDown(0.5);

  doc.fontSize(10).fillColor('#334155');
  doc.text('Account Number: ACCT-9921-X8');
  doc.text('Reporting Period: 2026-Q1 (Jan 1, 2026 - Mar 31, 2026)');
  doc.text('Billing Target: Acme Main Warehouse Site (Site-ID: site-1)');
  doc.moveDown(1.5);

  // Multi-Meter Details Table
  doc.fillColor('#0F172A').fontSize(11).text('Metered Power Details', { bold: true });
  doc.moveDown(0.5);

  const tableTop = doc.y;
  doc.fillColor('#EFF6FF').rect(50, tableTop, 500, 20).fill();
  doc.fillColor('#1E3A8A').fontSize(9);
  doc.text('Meter Serial', 60, tableTop + 5);
  doc.text('Location', 180, tableTop + 5);
  doc.text('Usage (kWh)', 300, tableTop + 5);
  doc.text('Rate / kWh', 420, tableTop + 5);

  // Row 1
  const r1 = tableTop + 20;
  doc.fillColor('#FFFFFF').rect(50, r1, 500, 20).fill();
  doc.fillColor('#334155');
  doc.text('MET-A-8829', 60, r1 + 5);
  doc.text('Processing Plant A', 180, r1 + 5);
  doc.text('12500', 300, r1 + 5);
  doc.text('$0.125', 420, r1 + 5);

  // Row 2
  const r2 = r1 + 20;
  doc.fillColor('#F8FAFC').rect(50, r2, 500, 20).fill();
  doc.fillColor('#334155');
  doc.text('MET-B-8830', 60, r2 + 5);
  doc.text('Storage Freezer Unit', 180, r2 + 5);
  doc.text('8200', 300, r2 + 5);
  doc.text('$0.132', 420, r2 + 5);

  // Summary Row
  const r3 = r2 + 20;
  doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(50, r3).lineTo(550, r3).stroke();
  doc.fillColor('#FFFFFF').rect(50, r3, 500, 20).fill();
  doc.fillColor('#0F172A').text('Total Grid Power Consumed (kwhConsumed):', 60, r3 + 5, { bold: true });
  doc.text('20700', 300, r3 + 5, { bold: true });
  doc.text('KWH', 350, r3 + 5, { bold: true });

  doc.moveDown(2);

  // Contractual Instruments Section
  doc.fillColor('#059669').fontSize(11).text('CONTRACTUAL GREEN TARIFF / REC MATCHING STATUS', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(9.5).fillColor('#065F46');
  doc.text('Tariff Option: 100% Dedicated Renewable Energy Supply Agreement (PPA)');
  doc.text('Green Power Certificate (recVerification): True');
  doc.text('REC Tracking Registry Serial: US-REC-PGE-2026-0091873');
  doc.text('Contractual Market-based Factor: 0.0000 kg CO2e / kWh (Zero Emissions)');

  doc.moveDown(2);
  doc.fillColor('#475569').fontSize(8.5).text('Notice: Under GHG Protocol Scope 2 dual-reporting guidelines, this site calculates both a Location-based (grid average) footprint and a Market-based (contractual) footprint based on the verified REC status.', { align: 'justify' });

  doc.end();
  console.log('Successfully generated complex_scope2_utility_bill.pdf');
}

// ── Generate Complex Scope 3 Bill of Lading (BOL) ──────────────────────────────
function generateScope3BOL() {
  const doc = new PDFDocument({ margin: 50, compress: false });
  const outputPath = path.join(__dirname, 'complex_scope3_freight_bol.pdf');
  const stream = fs.createWriteStream(outputPath);

  doc.pipe(stream);

  // Title & Header
  doc.fillColor('#7C3AED').fontSize(18).text('APEX GLOBAL LOGISTICS & FREIGHT', { align: 'center' });
  doc.fontSize(9).fillColor('#64748B').text('Intermodal Terminal, Port of Houston, TX', { align: 'center' });
  doc.moveDown(1.5);

  // Line
  doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(1);

  doc.fillColor('#0F172A').fontSize(13).text('STRAIGHT BILL OF LADING - LOGISTICS OVERVIEW', { underline: true });
  doc.moveDown(0.5);

  doc.fontSize(10).fillColor('#334155');
  doc.text('BOL Number: BOL-HOU-CHI-2026');
  doc.text('Carrier Name: Apex Fleet Lines');
  doc.text('Origin: Houston Port Facility (Houston, TX)');
  doc.text('Destination: Chicago Distribution Hub (Chicago, IL)');
  doc.text('Transit Route Distance (distanceKm): 1500 km');
  doc.moveDown(1.5);

  // Freight Items Table
  doc.fillColor('#0F172A').fontSize(11).text('Shipment Weight Details', { bold: true });
  doc.moveDown(0.5);

  const tableTop = doc.y;
  doc.fillColor('#F5F3FF').rect(50, tableTop, 500, 20).fill();
  doc.fillColor('#7C3AED').fontSize(9);
  doc.text('Cargo Line', 60, tableTop + 5);
  doc.text('Description', 180, tableTop + 5);
  doc.text('Quantity (Weight)', 320, tableTop + 5);
  doc.text('Unit', 450, tableTop + 5);

  // Row 1
  const r1 = tableTop + 20;
  doc.fillColor('#FFFFFF').rect(50, r1, 500, 20).fill();
  doc.fillColor('#334155');
  doc.text('Line 01', 60, r1 + 5);
  doc.text('Industrial Solar Inverters', 180, r1 + 5);
  doc.text('14000', 320, r1 + 5);
  doc.text('KG', 450, r1 + 5);

  // Row 2
  const r2 = r1 + 20;
  doc.fillColor('#F9F8FF').rect(50, r2, 500, 20).fill();
  doc.fillColor('#334155');
  doc.text('Line 02', 60, r2 + 5);
  doc.text('Electrical Copper Cabling', 180, r2 + 5);
  doc.text('6000', 320, r2 + 5);
  doc.text('KG', 450, r2 + 5);

  // Summary Row
  const r3 = r2 + 20;
  doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(50, r3).lineTo(550, r3).stroke();
  doc.fillColor('#FFFFFF').rect(50, r3, 500, 20).fill();
  doc.fillColor('#0F172A').text('Total Cargo Weight (weightKg):', 60, r3 + 5, { bold: true });
  doc.text('20000', 320, r3 + 5, { bold: true });
  doc.text('KG (20 Tonnes)', 450, r3 + 5, { bold: true });

  doc.moveDown(2.5);

  // GLEC Calculation Guidance Section
  doc.fillColor('#5B21B6').fontSize(11).text('GLEC V2 CO2e CALCULATION TRACE', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(9.5).fillColor('#4C1D95');
  doc.text('Logistics Framework: GLEC Global Logistics Emissions Council Standard');
  doc.text('Activity Value: 20 Tonnes * 1500 km = 30000 tkm');
  doc.text('GLEC Emission Coefficient: 0.0920 kg CO2e / tkm');
  doc.text('Category Mapping Code: UPSTREAM_TRANSPORT');

  doc.moveDown(2);
  doc.fillColor('#475569').fontSize(8.5).text('Notice: Scope 3 Category 4 calculations under GLEC framework utilize the weight-distance strategy. The weight in kilograms is divided by 1000 to convert to metric tonnes, multiplied by transited distance in kilometers, and multiplied by the GLEC road-freight factor.', { align: 'justify' });

  doc.end();
  console.log('Successfully generated complex_scope3_freight_bol.pdf');
}

generateScope2Bill();
generateScope3BOL();
