import type { DeviceItem } from './catalog';

export interface ParsedListingResult {
  matchedDevice: DeviceItem | null;
  detectedStorage?: string;
  detectedPrice?: number;
  detectedBattery?: number;
  flags: {
    hasBox: boolean;
    hasInvoice: boolean;
    hasWarranty: boolean;
    hasChanges: boolean;
    changeNotes: string[];
  };
  priceComparison?: {
    /** Signed (asking - reference) / reference * 100; negative means cheaper. */
    differencePercentage: number;
    status: 'FIRSAT' | 'NORMAL' | 'PAHALI';
  };
}

export interface ListingMetadata {
  success: true;
  title: string;
  description: string;
  image: string | null;
  /** Raw currency amount, not yet converted to a number. */
  rawPrice: string | null;
}

export interface ListingMetadataError {
  success: false;
  error: string;
  code:
    | 'METHOD_NOT_ALLOWED'
    | 'INVALID_REQUEST'
    | 'INVALID_URL'
    | 'UNSUPPORTED_HOST'
    | 'FETCH_FAILED'
    | 'TIMEOUT'
    | 'PAGE_TOO_LARGE'
    | 'NO_METADATA';
}

export type ListingMetadataResponse = ListingMetadata | ListingMetadataError;
