import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

const MD_PATH = path.resolve(__dirname, '../../../scratch/CARBONIQ_VIVA_MASTER_GUIDE.md');
const PDF_PATH = path.resolve(__dirname, '../../../scratch/CARBONIQ_VIVA_MASTER_GUIDE.pdf');

function cleanText(txt: string): string {
  return txt
    .replace(/[^\x00-\x7F]/g, (char) => {
      // Map common unicode to ASCII
      const map: Record<string, string> = {
        '—': '--',
        '–': '-',
        '’': "'",
        '‘': "'",
        '“': '"',
        '”': '"',
        '•': '*',
        '→': '->',
        '←': '<-',
        '▼': 'v',
        '▲': '^',
        '│': '|',
        '├──': '|--',
        '└──': '\\--',
        '├──►': '|-->',
        '└──►': '\\-->',
        '──►': '-->',
        '─': '-',
        '≈': '~=',
        '≠': '!=',
        '≤': '<=',
        '≥': '>=',
        '×': 'x',
        '₂': '2',
        '³': '3',
        '²': '2',
        'ϕ': 'phi',
        'π': 'pi',
        '±': '+/-',
        '…': '...',
        '↔': '<->',
      };
      return map[char] || '';
    })
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\$\$(.*?)\$\$/g, '$1')
    .replace(/\$(.*?)\$/g, '$1');
}

async function generatePdf() {
  console.log('Reading Markdown Guide from:', MD_PATH);
  const content = fs.readFileSync(MD_PATH, 'utf-8');
  const lines = content.split('\n');

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: true,
  });

  const writeStream = fs.createWriteStream(PDF_PATH);
  doc.pipe(writeStream);

  // Document Title Page / Banner
  doc.rect(50, 50, 495, 130).fill('#0F172A'); // Slate-900
  doc.rect(50, 50, 8, 130).fill('#10B981'); // Emerald accent

  doc.fillColor('#10B981').fontSize(11).font('Helvetica-Bold').text('CARBONIQ ENTERPRISE ARCHITECTURE', 70, 68);
  doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold').text('Final Year Technical Viva Master Guide', 70, 86);
  doc.fillColor('#94A3B8').fontSize(9).font('Helvetica').text('Comprehensive System Architecture, Carbon Engine, Document AI, RAG & ML Ladder Defense', 70, 115);
  doc.fillColor('#38BDF8').fontSize(8).font('Helvetica-Bold').text('CONFIDENTIAL & PROPRIETARY -- ACADEMIC DEFENSE & AUDIT MANUAL', 70, 150);

  doc.moveDown(3);
  doc.y = 200;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Page overflow management
    if (doc.y > 720) {
      doc.addPage();
    }

    if (trimmed.startsWith('# ')) {
      // H1 Header (New major section)
      if (doc.y > 200) doc.addPage();
      const title = cleanText(trimmed.replace(/^#\s+/, ''));
      doc.rect(50, doc.y, 495, 26).fill('#1E293B');
      doc.rect(50, doc.y, 5, 26).fill('#10B981');
      doc.fillColor('#FFFFFF').fontSize(13).font('Helvetica-Bold').text(title, 65, doc.y + 7);
      doc.y += 18;
      doc.moveDown(0.6);
    } else if (trimmed.startsWith('## ')) {
      // H2 Header
      if (doc.y > 680) doc.addPage();
      const title = cleanText(trimmed.replace(/^##\s+/, ''));
      doc.moveDown(0.8);
      doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text(title, 50);
      doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke();
      doc.moveDown(0.5);
    } else if (trimmed.startsWith('### ')) {
      // H3 Header
      if (doc.y > 690) doc.addPage();
      const title = cleanText(trimmed.replace(/^###\s+/, ''));
      doc.moveDown(0.5);
      doc.fillColor('#047857').fontSize(10).font('Helvetica-Bold').text(title, 50);
      doc.moveDown(0.3);
    } else if (trimmed.startsWith('#### ')) {
      // H4 Header
      const title = cleanText(trimmed.replace(/^####\s+/, ''));
      doc.moveDown(0.3);
      doc.fillColor('#1E293B').fontSize(9).font('Helvetica-Bold').text(title, 50);
      doc.moveDown(0.2);
    } else if (trimmed.startsWith('> ')) {
      // Callout / Viva Answer Quote Block
      const quote = cleanText(trimmed.replace(/^>\s+/, ''));
      if (doc.y > 690) doc.addPage();
      const startY = doc.y;
      doc.rect(50, startY, 495, 28).fill('#F0FDF4'); // Emerald-50
      doc.rect(50, startY, 4, 28).fill('#059669'); // Emerald-600
      doc.fillColor('#065F46').fontSize(8.5).font('Helvetica-Oblique').text(quote, 60, startY + 6, { width: 475 });
      doc.y = startY + 34;
    } else if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      // Table Row
      if (trimmed.includes('---')) continue; // Skip separator
      const cols = trimmed.split('|').map(c => cleanText(c.trim())).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (cols.length >= 2) {
        if (doc.y > 700) doc.addPage();
        const startY = doc.y;
        const isHeader = i > 0 && lines[i - 1]?.includes('|') && lines[i + 1]?.includes('---');
        if (isHeader) {
          doc.rect(50, startY, 495, 18).fill('#F1F5F9');
          doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold');
        } else {
          doc.fillColor('#334155').fontSize(7.5).font('Helvetica');
        }
        const colWidth = 495 / cols.length;
        cols.forEach((col, cIdx) => {
          doc.text(col, 54 + (cIdx * colWidth), startY + 4, { width: colWidth - 8, height: 14, ellipsis: true });
        });
        doc.y = startY + 16;
      }
    } else if (trimmed.startsWith('```')) {
      // Code block start / end
      continue;
    } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      // Bullet Point
      const bullet = cleanText(trimmed.replace(/^[\*\-]\s+/, ''));
      doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica');
      doc.text('-  ' + bullet, 58, doc.y, { width: 485, lineGap: 2 });
      doc.moveDown(0.2);
    } else if (/^\d+\.\s+/.test(trimmed)) {
      // Numbered List
      const item = cleanText(trimmed);
      doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica');
      doc.text(item, 58, doc.y, { width: 485, lineGap: 2 });
      doc.moveDown(0.2);
    } else if (trimmed.length > 0) {
      // Standard Paragraph
      const text = cleanText(trimmed);
      doc.fillColor('#1E293B').fontSize(8.5).font('Helvetica');
      doc.text(text, 50, doc.y, { width: 495, lineGap: 2.5 });
      doc.moveDown(0.3);
    } else {
      // Blank line
      doc.moveDown(0.4);
    }
  }

  // Add Footers and Running Page Numbers (Page X of Y)
  const range = doc.bufferedPageRange();
  for (let p = 0; p < range.count; p++) {
    doc.switchToPage(p);
    // Running Header (pages > 0)
    if (p > 0) {
      doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica').text('CarbonIQ Platform -- Technical Viva Master Guide', 50, 25);
      doc.text('Confidential Academic Material', 400, 25, { align: 'right' });
      doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(50, 36).lineTo(545, 36).stroke();
    }
    // Running Footer
    doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(50, 792 - 40).lineTo(545, 792 - 40).stroke();
    doc.fillColor('#64748B').fontSize(7.5).font('Helvetica').text('CarbonIQ -- AI Carbon Accounting & Compliance Intelligence Platform', 50, 792 - 32);
    doc.text(`Page ${p + 1} of ${range.count}`, 450, 792 - 32, { align: 'right' });
  }

  doc.end();

  await new Promise<void>((resolve) => writeStream.on('finish', () => resolve()));
  console.log('PDF Successfully Generated at:', PDF_PATH);
  const stats = fs.statSync(PDF_PATH);
  console.log(`PDF Size: ${(stats.size / 1024).toFixed(2)} KB | Total Pages: ${range.count}`);
}

generatePdf().catch(console.error);
