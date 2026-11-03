import type { VisualInspectionResult } from './visualInspection';

export type TestStatus = 'pending' | 'pass' | 'fail' | 'unsupported';
export type LabTestId = 'pixels' | 'touch' | 'audio' | 'vibration';
export interface LabResult { status: TestStatus; note: string; completedAt?: string }
export type LabResults = Record<LabTestId, LabResult>;
export interface InspectionFacts {
  visualInspection?: VisualInspectionResult;
  screenReplaced: boolean;
  missingDocuments: boolean;
  cosmeticDamage: boolean;
  caseCondition: TestStatus;
  trueTone: TestStatus;
  biometrics: TestStatus;
  cameras: TestStatus;
  liquid: TestStatus;
}
export interface ReportDetails { color: string; imeiLast4: string }
