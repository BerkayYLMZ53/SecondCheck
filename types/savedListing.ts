export type ValuationCondition = 'boxed' | 'device' | 'cosmetic';
export interface SavedItem {
  id: string;
  productId: string;
  title: string;
  askedPrice: number;
  condition: 'clean' | 'minor_defects' | 'faulty';
  date: string;
  // Preserve packaging separately: missing a box is not a hardware defect.
  valuationCondition?: ValuationCondition;
}
export type SaveListingInput = Omit<SavedItem, 'id' | 'date'>;
export type SavedComparisonPair = readonly [SavedItem, SavedItem];
