export type Category =
  | 'gpu'
  | 'cpu'
  | 'ram'
  | 'motherboard'
  | 'phone'
  | 'laptop'
  | 'console'
  | 'handheld'
  | 'monitor';

export type Severity = 'low' | 'medium' | 'high';

export interface ChronicIssue {
  id: string;
  title: string;
  severity: Severity;
  description: string;
  estimatedRepairCost: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  instruction: string;
  targetArea: string;
}

export interface Alternative {
  id: string;
  name: string;
  priceDiffNote: string;
  reason: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: Category;
  releaseYear: number;
  marketPriceMin: number;
  marketPriceMax: number;
  fairPrice: number;
  chronicIssues: ChronicIssue[];
  checklist: ChecklistItem[];
  alternatives: Alternative[];
}

export interface PriceAssessment {
  status: 'bargain' | 'fair' | 'overpriced';
  deltaPercentage: number;
  adviceText: string;
}
