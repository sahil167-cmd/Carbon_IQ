const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Ensure scratch directory exists
const scratchDir = path.resolve(__dirname);
if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

// 1. Missing Unit Document: Fuel delivery with quantity 4250 but unit omitted
function createMissingUnitDoc() {
  const doc = new PDFDocument({ margin: 50 });
  const outPath = path.join(scratchDir, 'exploratory_missing_unit.pdf');
  doc.pipe(fs.createWriteStream(outPath));

  doc.fontSize(20).text('INDUSTRIAL FUEL SUPPLY INVOICE', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text('Invoice Number: FUEL-INV-2026-0891');
  doc.text('Date: August 15, 2026');
  doc.text('Customer: Heavy Manufacturing Plant 4');
  doc.moveDown();
  doc.text('Item Description: Bulk Diesel Fuel Delivery for Backup Generator');
  doc.text('Quantity Delivered: 4250'); // Intentionally NO unit (no Liters, L, Gallons)
  doc.text('Price per unit: $1.25');
  doc.text('Total Amount: $5,312.50');
  doc.moveDown();
  doc.text('Authorized Signature: _______________________');
  doc.end();
  console.log(`Created: ${outPath}`);
}

// 2. Ambiguous Document: Conflicting meter readings on the same bill
function createAmbiguousDoc() {
  const doc = new PDFDocument({ margin: 50 });
  const outPath = path.join(scratchDir, 'exploratory_ambiguous_bill.pdf');
  doc.pipe(fs.createWriteStream(outPath));

  doc.fontSize(20).text('ELECTRIC POWER UTILITY STATEMENT', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text('Account Number: UTIL-ELEC-99210');
  doc.text('Billing Period: August 1, 2026 - August 31, 2026');
  doc.text('Facility: North Plant Substation');
  doc.moveDown();
  doc.text('Primary Meter (Reading A - Main Feed): 12,500 kWh');
  doc.text('Secondary Meter (Reading B - Total Inflow): 18,900 kWh');
  doc.text('Net Billed Active Energy: CONFLICTING METER DISCREPANCY DETECTED');
  doc.moveDown();
  doc.text('Rate: $0.14 / kWh');
  doc.text('Total Due: $2,184.00');
  doc.end();
  console.log(`Created: ${outPath}`);
}

// 3. Non-Emission Document: Corporate Employment Agreement
function createNonEmissionDoc() {
  const doc = new PDFDocument({ margin: 50 });
  const outPath = path.join(scratchDir, 'exploratory_employment_agreement.pdf');
  doc.pipe(fs.createWriteStream(outPath));

  doc.fontSize(20).text('STANDARD EMPLOYMENT AGREEMENT', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text('This Employment Agreement is entered into on August 1, 2026 between CarbonIQ Corp and the Employee.');
  doc.moveDown();
  doc.text('1. Position and Duties: The Employee shall serve as Senior Software Architect.');
  doc.text('2. Compensation: Base salary of $160,000 per annum payable semi-monthly.');
  doc.text('3. Confidentiality: Employee agrees not to disclose proprietary software designs.');
  doc.text('4. Governing Law: This agreement is governed by the laws of Delaware.');
  doc.moveDown();
  doc.text('Signed: __________________________ (Employee)');
  doc.text('Signed: __________________________ (Company Representative)');
  doc.end();
  console.log(`Created: ${outPath}`);
}

createMissingUnitDoc();
createAmbiguousDoc();
createNonEmissionDoc();
