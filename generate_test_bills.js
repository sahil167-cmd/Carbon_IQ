const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Helper to draw clean table headers
function drawHeader(doc, title, subtitle, color) {
  doc.fillColor(color).fontSize(18).text(title, { align: 'center' });
  doc.fontSize(9).fillColor('#64748B').text(subtitle, { align: 'center' });
  doc.moveDown(1);
  doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(1);
}

// Helper to draw metadata box
function drawMetaBox(doc, title, items) {
  doc.fillColor('#0F172A').fontSize(12).text(title, { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(9.5).fillColor('#334155');
  for (const item of items) {
    doc.text(`${item.label}: ${item.value}`);
  }
  doc.moveDown(1.5);
}

// ─────────────────────────────────────────────────────────────────────────────
// SCOPE 1 BILLS
// ─────────────────────────────────────────────────────────────────────────────

// 1. Scope 1 Stationary Diesel Generator
function generateScope1Diesel() {
  const doc = new PDFDocument({ margin: 50, compress: false });
  const file = path.join(__dirname, 'scope1_stationary_diesel_generator.pdf');
  doc.pipe(fs.createWriteStream(file));

  drawHeader(doc, 'CAT POWER GENERATION SERVICES', 'Industrial Backup Fuel Delivery Statement | Houston, TX', '#B45309');
  drawMetaBox(doc, 'INVOICE & DIESEL DISPATCH SUMMARY', [
    { label: 'Invoice Reference', value: 'INV-CAT-2026-9901' },
    { label: 'Facility Site', value: 'Texas Manufacturing Facility #4 (Site: site-1)' },
    { label: 'GHG Protocol Category', value: 'STATIONARY_COMBUSTION (Scope 1 Direct)' },
    { label: 'Fuel Commodity', value: 'Ultra-Low Sulfur Diesel #2' },
  ]);

  doc.fillColor('#0F172A').fontSize(10).text('Fuel Tank Line Breakdown:', { bold: true });
  doc.moveDown(0.5);

  const top = doc.y;
  doc.fillColor('#FEF3C7').rect(50, top, 500, 18).fill();
  doc.fillColor('#B45309').fontSize(9).text('Tank ID', 60, top + 4).text('Location', 180, top + 4).text('Volume Delivered (L)', 320, top + 4).text('Rate/L', 450, top + 4);

  const r1 = top + 18;
  doc.fillColor('#FFFFFF').rect(50, r1, 500, 18).fill();
  doc.fillColor('#334155').text('TANK-GEN-01', 60, r1 + 4).text('Primary Backup Generator', 180, r1 + 4).text('2,750', 320, r1 + 4).text('$1.15', 450, r1 + 4);

  const r2 = r1 + 18;
  doc.fillColor('#FFFBEB').rect(50, r2, 500, 18).fill();
  doc.fillColor('#334155').text('TANK-GEN-02', 60, r2 + 4).text('Auxiliary Fire Pump Engine', 180, r2 + 4).text('1,500', 320, r2 + 4).text('$1.15', 450, r2 + 4);

  const r3 = r2 + 18;
  doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, r3).lineTo(550, r3).stroke();
  doc.fillColor('#0F172A').fontSize(9.5).text('Total Stationary Fuel (quantity):', 60, r3 + 4, { bold: true });
  doc.text('4250', 320, r3 + 4, { bold: true });
  doc.text('LITERS', 450, r3 + 4, { bold: true });

  doc.moveDown(2.5);
  doc.fillColor('#92400E').fontSize(10).text('CARBON ENGINE EXPECTED IMPACT (GHG Protocol Scope 1):');
  doc.fontSize(9).fillColor('#78350F').text('Formula: 4,250.00 LITERS × 2.6800 kgCO2e/LITER = 11,390.00 kg CO2e (11.3900 t CO2e)');

  doc.end();
  console.log('✓ Generated scope1_stationary_diesel_generator.pdf');
}

// 2. Scope 1 Natural Gas Pipeline Utility
function generateScope1NaturalGas() {
  const doc = new PDFDocument({ margin: 50, compress: false });
  const file = path.join(__dirname, 'scope1_natural_gas_utility.pdf');
  doc.pipe(fs.createWriteStream(file));

  drawHeader(doc, 'ATMOS ENERGY UTILITY CORP', 'Industrial Natural Gas Monthly Statement | Columbus, OH', '#C2410C');
  drawMetaBox(doc, 'GAS FLOW METER STATEMENT', [
    { label: 'Account Number', value: 'NG-ATM-88192-01' },
    { label: 'Facility Site', value: 'Ohio Commercial Processing Hub (Site: site-1)' },
    { label: 'GHG Protocol Category', value: 'STATIONARY_COMBUSTION (Scope 1 Direct)' },
    { label: 'Fuel Type', value: 'Pipeline Natural Gas (NATURAL_GAS)' },
  ]);

  doc.fillColor('#0F172A').fontSize(10).text('Monthly Volume Meter Readings:', { bold: true });
  doc.moveDown(0.5);

  const top = doc.y;
  doc.fillColor('#FFEDD5').rect(50, top, 500, 18).fill();
  doc.fillColor('#C2410C').fontSize(9).text('Meter Serial', 60, top + 4).text('Start/End Dates', 180, top + 4).text('Volume Consumed (m³)', 320, top + 4).text('Unit Price', 450, top + 4);

  const r1 = top + 18;
  doc.fillColor('#FFFFFF').rect(50, r1, 500, 18).fill();
  doc.fillColor('#334155').text('MTR-GAS-9912', 60, r1 + 4).text('Jan 01 - Jan 31', 180, r1 + 4).text('18,400', 320, r1 + 4).text('$0.45/m³', 450, r1 + 4);

  const r2 = r1 + 18;
  doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, r2).lineTo(550, r2).stroke();
  doc.fillColor('#0F172A').fontSize(9.5).text('Total Natural Gas Consumption (quantity):', 60, r2 + 4, { bold: true });
  doc.text('18400', 320, r2 + 4, { bold: true });
  doc.text('M3', 450, r2 + 4, { bold: true });

  doc.moveDown(2.5);
  doc.fillColor('#9A3412').fontSize(10).text('CARBON ENGINE EXPECTED IMPACT (GHG Protocol Scope 1):');
  doc.fontSize(9).fillColor('#7C2D12').text('Formula: 18,400.00 M3 × 2.0200 kgCO2e/M3 = 37,168.00 kg CO2e (37.1680 t CO2e)');

  doc.end();
  console.log('✓ Generated scope1_natural_gas_utility.pdf');
}

// 3. Scope 1 Mobile Fleet Vehicle Diesel
function generateScope1MobileFleet() {
  const doc = new PDFDocument({ margin: 50, compress: false });
  const file = path.join(__dirname, 'scope1_mobile_fleet_diesel.pdf');
  doc.pipe(fs.createWriteStream(file));

  drawHeader(doc, 'SHELL FLEET COMMERCIAL SERVICES', 'Commercial Transport Vehicle Fuel Dispatch | Chicago, IL', '#B45309');
  drawMetaBox(doc, 'COMMERCIAL FLEET CARD SUMMARY', [
    { label: 'Fleet Account ID', value: 'FLT-SHL-55421' },
    { label: 'Facility Site', value: 'Central Distribution Depot (Site: site-1)' },
    { label: 'GHG Protocol Category', value: 'MOBILE_COMBUSTION (Scope 1 Direct)' },
    { label: 'Refueling Mode', value: '12 Heavy Distribution Vans & Trucks' },
  ]);

  doc.fillColor('#0F172A').fontSize(10).text('Fleet Refueling Line Items:', { bold: true });
  doc.moveDown(0.5);

  const top = doc.y;
  doc.fillColor('#FEF3C7').rect(50, top, 500, 18).fill();
  doc.fillColor('#B45309').fontSize(9).text('Fleet Batch ID', 60, top + 4).text('Vehicle Count', 180, top + 4).text('Fuel Volume (Gallons)', 320, top + 4).text('Total Cost', 450, top + 4);

  const r1 = top + 18;
  doc.fillColor('#FFFFFF').rect(50, r1, 500, 18).fill();
  doc.fillColor('#334155').text('BATCH-CHI-01', 60, r1 + 4).text('12 Heavy Trucks', 180, r1 + 4).text('6,850', 320, r1 + 4).text('$26,372.50', 450, r1 + 4);

  const r2 = r1 + 18;
  doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, r2).lineTo(550, r2).stroke();
  doc.fillColor('#0F172A').fontSize(9.5).text('Total Fleet Diesel Volume (quantity):', 60, r2 + 4, { bold: true });
  doc.text('6850', 320, r2 + 4, { bold: true });
  doc.text('GALLONS', 450, r2 + 4, { bold: true });

  doc.moveDown(2.5);
  doc.fillColor('#92400E').fontSize(10).text('CARBON ENGINE EXPECTED IMPACT (GHG Protocol Scope 1):');
  doc.fontSize(9).fillColor('#78350F').text('Formula: 6,850.00 GALLONS × 3.78541 (GAL → LITERS) = 25,930.06 LITERS × 2.6800 kgCO2e/LITER = 69,492.56 kg CO2e (69.4926 t CO2e)');

  doc.end();
  console.log('✓ Generated scope1_mobile_fleet_diesel.pdf');
}

// ─────────────────────────────────────────────────────────────────────────────
// SCOPE 2 BILLS
// ─────────────────────────────────────────────────────────────────────────────

// 4. Scope 2 US Industrial Power Utility
function generateScope2USPower() {
  const doc = new PDFDocument({ margin: 50, compress: false });
  const file = path.join(__dirname, 'scope2_us_industrial_power.pdf');
  doc.pipe(fs.createWriteStream(file));

  drawHeader(doc, 'CONEDISON COMMERCIAL ENERGY', 'High-Voltage Commercial Electricity Statement | New York, NY', '#1D4ED8');
  drawMetaBox(doc, 'ELECTRICITY UTILITY INVOICE', [
    { label: 'Account Number', value: 'ACCT-CONED-99120' },
    { label: 'Facility Site', value: 'New York Regional Headquarters (Site: site-1)' },
    { label: 'GHG Protocol Category', value: 'ELECTRICITY (Scope 2 Indirect)' },
    { label: 'Grid Sub-Region', value: 'US_GRID (eGRID NYUP)' },
  ]);

  doc.fillColor('#0F172A').fontSize(10).text('Time-Of-Use Meter Reading Breakdown:', { bold: true });
  doc.moveDown(0.5);

  const top = doc.y;
  doc.fillColor('#DBEAFE').rect(50, top, 500, 18).fill();
  doc.fillColor('#1D4ED8').fontSize(9).text('Meter Register', 60, top + 4).text('Tariff Period', 180, top + 4).text('Energy Consumed (kWh)', 320, top + 4).text('Rate/kWh', 450, top + 4);

  const r1 = top + 18;
  doc.fillColor('#FFFFFF').rect(50, r1, 500, 18).fill();
  doc.fillColor('#334155').text('REG-PEAK-01', 60, r1 + 4).text('Peak Operating Hours', 180, r1 + 4).text('45,000', 320, r1 + 4).text('$0.145', 450, r1 + 4);

  const r2 = r1 + 18;
  doc.fillColor('#EFF6FF').rect(50, r2, 500, 18).fill();
  doc.fillColor('#334155').text('REG-OFFPEAK-02', 60, r2 + 4).text('Off-Peak Night Hours', 180, r2 + 4).text('32,500', 320, r2 + 4).text('$0.098', 450, r2 + 4);

  const r3 = r2 + 18;
  doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, r3).lineTo(550, r3).stroke();
  doc.fillColor('#0F172A').fontSize(9.5).text('Total Electricity Consumed (kwhConsumed):', 60, r3 + 4, { bold: true });
  doc.text('77500', 320, r3 + 4, { bold: true });
  doc.text('KWH', 450, r3 + 4, { bold: true });

  doc.moveDown(2.5);
  doc.fillColor('#1E40AF').fontSize(10).text('CARBON ENGINE EXPECTED IMPACT (GHG Protocol Scope 2):');
  doc.fontSize(9).fillColor('#1E3A8A').text('Formula: 77,500.00 KWH × 0.3850 kgCO2e/KWH = 29,837.50 kg CO2e (29.8375 t CO2e)');

  doc.end();
  console.log('✓ Generated scope2_us_industrial_power.pdf');
}

// 5. Scope 2 India Manufacturing Grid Electricity
function generateScope2IndiaGrid() {
  const doc = new PDFDocument({ margin: 50, compress: false });
  const file = path.join(__dirname, 'scope2_india_manufacturing_grid.pdf');
  doc.pipe(fs.createWriteStream(file));

  drawHeader(doc, 'TATA POWER DISTRIBUTION LTD', 'High-Tension Industrial Electricity Tariff Statement | Pune, MH', '#047857');
  drawMetaBox(doc, 'HT ELECTRICITY BILL', [
    { label: 'Consumer Number', value: 'HT-PUNE-883011' },
    { label: 'Facility Site', value: 'Pune Advanced Manufacturing Plant (Site: site-1, Country: IN)' },
    { label: 'GHG Protocol Category', value: 'ELECTRICITY (Scope 2 Indirect)' },
    { label: 'Grid Region', value: 'IN_GRID (India National Grid)' },
  ]);

  doc.fillColor('#0F172A').fontSize(10).text('HT Meter Reading Details:', { bold: true });
  doc.moveDown(0.5);

  const top = doc.y;
  doc.fillColor('#D1FAE5').rect(50, top, 500, 18).fill();
  doc.fillColor('#047857').fontSize(9).text('HT Meter ID', 60, top + 4).text('Tariff Category', 180, top + 4).text('Energy Billed (kWh)', 320, top + 4).text('Amount (INR)', 450, top + 4);

  const r1 = top + 18;
  doc.fillColor('#FFFFFF').rect(50, r1, 500, 18).fill();
  doc.fillColor('#334155').text('IN-HT-PUN-772', 60, r1 + 4).text('Industrial Heavy Tariff', 180, r1 + 4).text('125,000', 320, r1 + 4).text('₹1,025,000', 450, r1 + 4);

  const r2 = r1 + 18;
  doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, r2).lineTo(550, r2).stroke();
  doc.fillColor('#0F172A').fontSize(9.5).text('Total Billed Electricity (kwhConsumed):', 60, r2 + 4, { bold: true });
  doc.text('125000', 320, r2 + 4, { bold: true });
  doc.text('KWH', 450, r2 + 4, { bold: true });

  doc.moveDown(2.5);
  doc.fillColor('#065F46').fontSize(10).text('CARBON ENGINE EXPECTED IMPACT (GHG Protocol Scope 2):');
  doc.fontSize(9).fillColor('#064E3B').text('Formula: 125,000.00 KWH × 0.7160 kgCO2e/KWH = 89,500.00 kg CO2e (89.5000 t CO2e)');

  doc.end();
  console.log('✓ Generated scope2_india_manufacturing_grid.pdf');
}

// 6. Scope 2 EU Renewable REC Verified Electricity
function generateScope2EURenewable() {
  const doc = new PDFDocument({ margin: 50, compress: false });
  const file = path.join(__dirname, 'scope2_eu_renewable_rec_facility.pdf');
  doc.pipe(fs.createWriteStream(file));

  drawHeader(doc, 'VATTENFALL EUROPE GMBH', 'Green Power Supply & Guarantee of Origin (GO/REC) Statement | Frankfurt', '#0D9488');
  drawMetaBox(doc, 'RENEWABLE ENERGY CONTRACT STATEMENT', [
    { label: 'Contract Reference', value: 'PPA-EU-VATT-4401' },
    { label: 'Facility Site', value: 'Frankfurt Data Center & Tech Hub (Site: site-1, Country: EU)' },
    { label: 'GHG Protocol Scope', value: 'Scope 2 Dual-Reporting' },
    { label: 'REC Certificate Verification', value: 'recVerification: true (Guarantee of Origin GO-2026-8819)' },
  ]);

  doc.fillColor('#0F172A').fontSize(10).text('Renewable Power Metering Line Items:', { bold: true });
  doc.moveDown(0.5);

  const top = doc.y;
  doc.fillColor('#CCFBF1').rect(50, top, 500, 18).fill();
  doc.fillColor('#0D9488').fontSize(9).text('Power Asset', 60, top + 4).text('Certificate Serial', 180, top + 4).text('Energy Supplied (kWh)', 320, top + 4).text('Tariff Option', 450, top + 4);

  const r1 = top + 18;
  doc.fillColor('#FFFFFF').rect(50, r1, 500, 18).fill();
  doc.fillColor('#334155').text('WIND-PARK-FRA', 60, r1 + 4).text('GO-DE-2026-9921', 180, r1 + 4).text('92,000', 320, r1 + 4).text('100% Wind PPA', 450, r1 + 4);

  const r2 = r1 + 18;
  doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, r2).lineTo(550, r2).stroke();
  doc.fillColor('#0F172A').fontSize(9.5).text('Total Renewable Power (kwhConsumed):', 60, r2 + 4, { bold: true });
  doc.text('92000', 320, r2 + 4, { bold: true });
  doc.text('KWH', 450, r2 + 4, { bold: true });

  doc.moveDown(2.5);
  doc.fillColor('#115E59').fontSize(10).text('CARBON ENGINE EXPECTED IMPACT (GHG Scope 2 Dual Reporting):');
  doc.fontSize(9).fillColor('#134E4A').text('Location-based: 92,000.00 KWH × 0.2550 kgCO2e/KWH = 23,460.00 kg CO2e (23.4600 t CO2e)');
  doc.fontSize(9).fillColor('#047857').text('Market-based (Verified REC): 92,000.00 KWH × 0.0000 kgCO2e/KWH = 0.00 kg CO2e (0.0000 t CO2e)');

  doc.end();
  console.log('✓ Generated scope2_eu_renewable_rec_facility.pdf');
}

// ─────────────────────────────────────────────────────────────────────────────
// SCOPE 3 BILLS
// ─────────────────────────────────────────────────────────────────────────────

function generateScope3OceanFreight() {
  const doc = new PDFDocument({ margin: 50, compress: false });
  const file = path.join(__dirname, 'scope3_ocean_intermodal_freight.pdf');
  doc.pipe(fs.createWriteStream(file));

  drawHeader(doc, 'MAERSK LINE INTERMODAL LOGISTICS', 'Ocean Container Cargo Bill of Lading (BOL) | Port of Long Beach', '#6D28D9');
  drawMetaBox(doc, 'STRAIGHT BILL OF LADING', [
    { label: 'BOL Number', value: 'BOL-MAE-2026-9901' },
    { label: 'Vessel / Voyage', value: 'MAERSK MC-KINNEY / V-2026' },
    { label: 'Origin -> Destination', value: 'Shanghai Port, CN -> Long Beach Port, USA' },
    { label: 'Transit Route Distance', value: 'distanceKm: 10400 km' },
  ]);

  doc.fillColor('#0F172A').fontSize(10).text('Cargo Container Line Items:', { bold: true });
  doc.moveDown(0.5);

  const top = doc.y;
  doc.fillColor('#EDE9FE').rect(50, top, 500, 18).fill();
  doc.fillColor('#6D28D9').fontSize(9).text('Container ID', 60, top + 4).text('Cargo Description', 180, top + 4).text('Gross Weight (Kg)', 320, top + 4).text('Unit', 450, top + 4);

  const r1 = top + 18;
  doc.fillColor('#FFFFFF').rect(50, r1, 500, 18).fill();
  doc.fillColor('#334155').text('MSKU-8821901', 60, r1 + 4).text('Industrial Equipment & Motors', 180, r1 + 4).text('45,500', 320, r1 + 4).text('KG (45.5 Tonnes)', 450, r1 + 4);

  const r2 = r1 + 18;
  doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, r2).lineTo(550, r2).stroke();
  doc.fillColor('#0F172A').fontSize(9.5).text('Total Cargo Weight (weightKg):', 60, r2 + 4, { bold: true });
  doc.text('45500', 320, r2 + 4, { bold: true });
  doc.text('KG', 450, r2 + 4, { bold: true });

  doc.moveDown(2.5);
  doc.fillColor('#5B21B6').fontSize(10).text('CARBON ENGINE EXPECTED IMPACT (GLEC V2 Ocean Freight Scope 3):');
  doc.fontSize(9).fillColor('#4C1D95').text('Formula: 45.50 Tonnes × 10,400.00 Km = 473,200.00 Tonne-Km × 0.0161 kgCO2e/Tonne-Km = 7,618.52 kg CO2e (7.6185 t CO2e)');

  doc.end();
  console.log('✓ Generated scope3_ocean_intermodal_freight.pdf');
}

// 8. Scope 3 Express Air Freight Air Waybill
function generateScope3AirFreight() {
  const doc = new PDFDocument({ margin: 50, compress: false });
  const file = path.join(__dirname, 'scope3_air_freight_airwaybill.pdf');
  doc.pipe(fs.createWriteStream(file));

  drawHeader(doc, 'LUFTHANSA CARGO EXPRESS', 'International Cargo Air Waybill Invoice | Munich Hub', '#7E22CE');
  drawMetaBox(doc, 'AIR WAYBILL (AWB) STATEMENT', [
    { label: 'Air Waybill Number', value: 'AWB-020-88392011' },
    { label: 'Airport Pair Route', value: 'Frankfurt (FRA) -> Chicago O\'Hare (ORD)' },
    { label: 'Air Flight Distance', value: 'distanceKm: 6900 km' },
    { label: 'Category Code', value: 'UPSTREAM_TRANSPORT (AIR_FREIGHT)' },
  ]);

  doc.fillColor('#0F172A').fontSize(10).text('Air Freight Pallet Line Details:', { bold: true });
  doc.moveDown(0.5);

  const top = doc.y;
  doc.fillColor('#F3E8FF').rect(50, top, 500, 18).fill();
  doc.fillColor('#7E22CE').fontSize(9).text('Pallet ID', 60, top + 4).text('Cargo Description', 180, top + 4).text('Billed Weight (Kg)', 320, top + 4).text('Rate / Kg', 450, top + 4);

  const r1 = top + 18;
  doc.fillColor('#FFFFFF').rect(50, r1, 500, 18).fill();
  doc.fillColor('#334155').text('PLT-AIR-9921', 60, r1 + 4).text('Precision Semiconductors', 180, r1 + 4).text('3,200', 320, r1 + 4).text('$4.85', 450, r1 + 4);

  const r2 = r1 + 18;
  doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, r2).lineTo(550, r2).stroke();
  doc.fillColor('#0F172A').fontSize(9.5).text('Total Air Cargo Weight (weightKg):', 60, r2 + 4, { bold: true });
  doc.text('3200', 320, r2 + 4, { bold: true });
  doc.text('KG (3.2 Tonnes)', 450, r2 + 4, { bold: true });

  doc.moveDown(2.5);
  doc.fillColor('#6B21A8').fontSize(10).text('CARBON ENGINE EXPECTED IMPACT (GLEC Air Freight Scope 3):');
  doc.fontSize(9).fillColor('#581C87').text('Formula: 3.20 Tonnes × 6,900.00 Km = 22,080.00 Tonne-Km × 0.6020 kgCO2e/Tonne-Km = 13,292.16 kg CO2e (13.2922 t CO2e)');

  doc.end();
  console.log('✓ Generated scope3_air_freight_airwaybill.pdf');
}

// 9. Scope 3 Purchased Goods Industrial Steel Invoice
function generateScope3PurchasedSteel() {
  const doc = new PDFDocument({ margin: 50, compress: false });
  const file = path.join(__dirname, 'scope3_purchased_goods_steel.pdf');
  doc.pipe(fs.createWriteStream(file));

  drawHeader(doc, 'ARCELORMITTAL STEEL SUPPLY CORP', 'Commercial Structural Steel Supply Invoice | Pittsburgh, PA', '#BE185D');
  drawMetaBox(doc, 'PURCHASED GOODS MATERIAL INVOICE', [
    { label: 'Purchase Order ID', value: 'PO-STEEL-2026-882' },
    { label: 'Delivery Destination', value: 'Infrastructure Build Site #3 (Site: site-1)' },
    { label: 'GHG Protocol Category', value: 'PURCHASED_GOODS (Scope 3 Category 1)' },
    { label: 'Material Commodity', value: 'Structural Carbon Steel Beams (STEEL)' },
  ]);

  doc.fillColor('#0F172A').fontSize(10).text('Steel Material Line Items:', { bold: true });
  doc.moveDown(0.5);

  const top = doc.y;
  doc.fillColor('#FCE7F3').rect(50, top, 500, 18).fill();
  doc.fillColor('#BE185D').fontSize(9).text('Item Code', 60, top + 4).text('Description', 180, top + 4).text('Quantity (Kg)', 320, top + 4).text('Price / Kg', 450, top + 4);

  const r1 = top + 18;
  doc.fillColor('#FFFFFF').rect(50, r1, 500, 18).fill();
  doc.fillColor('#334155').text('STL-BEAM-W12', 60, r1 + 4).text('Wide Flange Steel Beams', 180, r1 + 4).text('28,500', 320, r1 + 4).text('$1.85', 450, r1 + 4);

  const r2 = r1 + 18;
  doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, r2).lineTo(550, r2).stroke();
  doc.fillColor('#0F172A').fontSize(9.5).text('Total Steel Material Weight (quantity):', 60, r2 + 4, { bold: true });
  doc.text('28500', 320, r2 + 4, { bold: true });
  doc.text('KG', 450, r2 + 4, { bold: true });

  doc.moveDown(2.5);
  doc.fillColor('#9D174D').fontSize(10).text('CARBON ENGINE EXPECTED IMPACT (GHG Scope 3 Category 1):');
  doc.fontSize(9).fillColor('#831843').text('Formula: 28,500.00 KG × 1.8300 kgCO2e/KG = 52,155.00 kg CO2e (52.1550 t CO2e)');

  doc.end();
  console.log('✓ Generated scope3_purchased_goods_steel.pdf');
}

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTE ALL 9 PDF GENERATORS
// ─────────────────────────────────────────────────────────────────────────────
console.log('Generating 9 Complex PDF Bills (3 Scope 1, 3 Scope 2, 3 Scope 3)...');
generateScope1Diesel();
generateScope1NaturalGas();
generateScope1MobileFleet();

generateScope2USPower();
generateScope2IndiaGrid();
generateScope2EURenewable();

generateScope3OceanFreight();
generateScope3AirFreight();
generateScope3PurchasedSteel();
console.log('All 9 complex PDF test bills successfully generated!');
