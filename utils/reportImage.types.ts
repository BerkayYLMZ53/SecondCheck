export interface ReportImageArtifact { uri: string; filename: string; blob?: Blob }
export type CaptureReportSvg = (width: number, height: number) => Promise<string>;
