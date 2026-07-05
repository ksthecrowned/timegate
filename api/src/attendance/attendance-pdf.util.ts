// pdfkit is CommonJS; default import breaks under Nest/ts compile.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');

export type AttendancePdfRow = {
  date: string;
  employeeName: string;
  branch: string;
  status: string;
  shift: string;
  leaveType: string;
  checkinsCount: number;
};

export type AttendancePdfMeta = {
  from: string;
  to: string;
  companyName?: string | null;
  generatedAtIso?: string;
  generatedByEmail?: string | null;
  legalDigestSha256?: string;
  rowCount?: number;
};

const MAX_ROWS = 10_000;

export function buildAttendanceDaysPdf(rows: AttendancePdfRow[], meta: AttendancePdfMeta): Promise<Buffer> {
  if (rows.length > MAX_ROWS) {
    return Promise.reject(new Error(`Export limit exceeded (${MAX_ROWS} rows max)`));
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const generatedAtIso = meta.generatedAtIso ?? new Date().toISOString();
    const generatedAtLabel = generatedAtIso.replace('T', ' ').replace('Z', ' UTC');

    doc.fontSize(16).text('Export legal de presence', { align: 'center' });
    doc.moveDown(0.5);
    if (meta.companyName) {
      doc.fontSize(11).text(meta.companyName, { align: 'center' });
    }
    doc.fontSize(10).text(`Période : ${meta.from} → ${meta.to}`, { align: 'center' });
    doc.text(`Horodatage UTC : ${generatedAtLabel}`, { align: 'center' });
    doc.text(`Généré par : ${meta.generatedByEmail ?? 'system'}`, { align: 'center' });
    doc.text(`Lignes : ${meta.rowCount ?? rows.length}`, { align: 'center' });
    if (meta.legalDigestSha256) {
      doc.fontSize(8).text(`Empreinte SHA-256 : ${meta.legalDigestSha256}`, {
        align: 'center',
      });
      doc.fontSize(10);
    }
    doc.moveDown();

    const headers = ['Date', 'Employé', 'Branche', 'Statut', 'Horaire', 'Congé', 'Check-ins'];
    const colWidths = [62, 95, 70, 55, 70, 70, 45];
    let y = doc.y;

    doc.fontSize(8).font('Helvetica-Bold');
    let x = doc.page.margins.left;
    headers.forEach((header, i) => {
      doc.text(header, x, y, { width: colWidths[i], lineBreak: false });
      x += colWidths[i];
    });
    y += 14;
    doc.font('Helvetica');

    for (const row of rows) {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = doc.page.margins.top;
      }
      x = doc.page.margins.left;
      const values = [
        row.date,
        row.employeeName,
        row.branch,
        row.status,
        row.shift,
        row.leaveType,
        String(row.checkinsCount),
      ];
      values.forEach((value, i) => {
        doc.text(value, x, y, { width: colWidths[i], lineBreak: false });
        x += colWidths[i];
      });
      y += 12;
    }

    doc.end();
  });
}
