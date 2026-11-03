export type ChassisCondition = 'straight' | 'bent';
export type CosmeticCondition = 'pristine' | 'hairline' | 'dented';
export type VisualCondition = CosmeticCondition | 'bent';
export type VisualPhotoTarget = 'chassis' | 'corners';
export interface VisualEvidencePhoto {
  dataUri: string;
  width: number;
  height: number;
  source: 'camera' | 'upload';
  recordedAt: string;
}
export interface VisualInspectionResult {
  condition: VisualCondition;
  chassis: ChassisCondition;
  cosmetic: CosmeticCondition;
  score: 10 | 8.5 | 6.5 | 4;
  label: string;
  photos: Record<VisualPhotoTarget, VisualEvidencePhoto>;
  guide: { angle: number; widthPercent: number; heightPercent: number };
  createdAt: string;
  source: 'guided-user-observation';
}
export interface ScannerRawPhoto { uri: string; width: number; height: number }
export interface ScannerCameraHandle { capture: () => Promise<ScannerRawPhoto> }
export interface ScannerCameraProps { onReady: () => void; onError: (message: string) => void }
