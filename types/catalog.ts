export type DeviceBrand = 'Apple' | 'Samsung' | 'Xiaomi' | 'Redmi';

export interface DeviceItem {
  /** Stable model identifier; storage/color options belong to this model. */
  id: string;
  brand: DeviceBrand;
  model: string;
  /** First commercial release year in any region; 0 means unknown/concept. */
  releaseYear: number;
  variants: {
    storage: string[];
    colors: string[];
  };
  /** Modeled TRY estimates, not live quotes; all-zero means unavailable. */
  estimatedPriceBand: {
    minTry: number;
    avgTry: number;
    maxTry: number;
  };
  /** Documented issues and explicitly labeled inspection risks, not prevalence. */
  chronicIssues: string[];
  criticalChecks: string[];
}
