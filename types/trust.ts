export type TrustGrade = 'A+' | 'B' | 'C';
export interface TrustAdjustment { id: string; points: number; label: string }
export interface TrustAssessment {
  score: number;
  grade: TrustGrade;
  color: '#10b981' | '#f59e0b' | '#ef4444';
  label: string;
  adjustments: TrustAdjustment[];
  completed: number;
  total: number;
  provisional: boolean;
  available: boolean;
}
