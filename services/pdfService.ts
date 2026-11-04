// Metro selects the existing native Print/Sharing or web printable-document path.
// Reuse its secure random report ID and temporary-file cleanup in one public service.
export { generatePdfReport } from '../utils/generatePdfReport';
export { buildPdfReport } from '../utils/pdfReportHtml';
export type { PdfReportInput, PdfReportSnapshot } from '../utils/pdfReportHtml';
