const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function createSampleElectricityBill() {
  const doc = new PDFDocument({ margin: 50 });
  const outputPath = path.join(__dirname, 'sample_electricity_bill.pdf');
  const stream = fs.createWriteStream(outputPath);

  doc.pipe(stream);

  // Header styling
  doc.fillColor('#0F172A').fontSize(22).text('ENTERPRISE POWER & LIGHT CO.', { align: 'center' });
  doc.fontSize(10).fillColor('#64748B').text('100 Clean Energy Way, Sector 4, Silicon Valley', { align: 'center' });
  doc.moveDown(2);

  // Divider line
  doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(1.5);

  // Bill Details
  doc.fillColor('#0F172A').fontSize(14).text('UTILITY BILLING INVOICE', { underline: true });
  doc.moveDown(0.5);

  doc.fontSize(10).fillColor('#1E293B');
  doc.text('Invoice Number: INV-2026-8879');
  doc.text('Billing Date: April 2, 2026');
  doc.text('Billing Period: January 1, 2026 - March 31, 2026 (2026-Q1)');
  doc.text('Customer Account: Acme Production Facility (Org-100)');
  doc.moveDown(1.5);

  // Usage Table Headers
  doc.fillColor('#0F172A').fontSize(12).text('Electricity Consumption details', { bold: true });
  doc.moveDown(0.5);

  // Drawing Table Background
  const tableTop = doc.y;
  doc.fillColor('#F1F5F9').rect(50, tableTop, 500, 25).fill();
  
  // Table Text
  doc.fillColor('#0F172A').fontSize(10);
  doc.text('Description', 60, tableTop + 7);
  doc.text('Quantity', 250, tableTop + 7);
  doc.text('Unit', 350, tableTop + 7);
  doc.text('Total Amount', 450, tableTop + 7);

  // Table Row
  const rowTop = tableTop + 25;
  doc.fillColor('#FFFFFF').rect(50, rowTop, 500, 25).fill();
  doc.fillColor('#1E293B');
  doc.text('Grid Energy consumption', 60, rowTop + 7);
  doc.text('25000', 250, rowTop + 7);
  doc.text('KWH', 350, rowTop + 7);
  doc.text('$3,125.00', 450, rowTop + 7);

  // Border lines for table
  doc.strokeColor('#E2E8F0').lineWidth(1)
     .moveTo(50, tableTop).lineTo(550, tableTop)
     .moveTo(50, tableTop + 25).lineTo(550, tableTop + 25)
     .moveTo(50, rowTop + 25).lineTo(550, rowTop + 25)
     .stroke();

  doc.moveDown(2);

  // Green Energy Certificate Certification (for Market-based validation)
  doc.fillColor('#047857').fontSize(11).text('RENEWABLE ENERGY CERTIFICATE (REC) VERIFICATION', { underline: true });
  doc.moveDown(0.5);
  doc.fillColor('#065F46').fontSize(10);
  doc.text('Green Power REC Verification Status: True');
  doc.text('Certification Code: REC-2026-US-GREEN-77A9');
  doc.text('Certified Source: US Grid Wind & Solar Portfolio');
  
  doc.moveDown(2.5);

  // Footer / Instructions
  doc.fillColor('#64748B').fontSize(9);
  doc.text('For questions regarding this bill or your carbon emissions profile, contact support@carbonos.com.', { align: 'center' });

  doc.end();

  stream.on('finish', () => {
    console.log('Successfully generated sample_electricity_bill.pdf');
  });
}

createSampleElectricityBill();
