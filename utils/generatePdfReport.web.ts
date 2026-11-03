import type { PdfReportInput } from './pdfReportHtml';
import { buildPdfReport } from './pdfReportHtml';

/** Open synchronously from the user's click to preserve popup/user-activation permission. */
export async function generatePdfReport(input: PdfReportInput): Promise<string> {
  const id = globalThis.crypto?.randomUUID?.();
  if (!id) throw new Error('Güvenli rapor kimliği için HTTPS veya localhost kullanın.');
  const report = buildPdfReport(input, id);
  const url = URL.createObjectURL(new Blob([report.html], { type: 'text/html;charset=utf-8' }));
  const tab = window.open(url, '_blank');
  if (!tab) { URL.revokeObjectURL(url); throw new Error('Rapor penceresi engellendi. Bu site için açılır pencereye izin verip yeniden deneyin.'); }
  tab.opener = null;
  // Long enough to reload/print; the document no longer needs its URL afterwards.
  setTimeout(() => URL.revokeObjectURL(url), 120000);
  return report.code;
}
