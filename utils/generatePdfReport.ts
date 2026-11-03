import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import type { PdfReportInput } from './pdfReportHtml';
import { buildPdfReport } from './pdfReportHtml';

export async function generatePdfReport(input: PdfReportInput): Promise<string> {
  const report = buildPdfReport(input, Crypto.randomUUID());
  const { uri } = await Print.printToFileAsync({ html: report.html, width: 595, height: 842, base64: false });
  try {
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'SecondCheck PDF raporunu kaydet / paylaş' });
    else await Print.printAsync({ uri });
  } finally { try { new File(uri).delete(); } catch { /* Cache cleanup must not mask an export outcome. */ } }
  return report.code;
}
