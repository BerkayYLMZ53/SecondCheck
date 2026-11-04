import type { InspectionFacts } from '../types/inspection';
import type { ParsedListingResult } from '../types/listing';
import { catalogDeviceName, listingMoney } from './listingAnalysisReport';
import { calculateDeviceValuation } from './deviceValuation';

export interface BargainingDeduction { id: string; label: string; amount: number }
export function calculateBargain(result: ParsedListingResult, facts: InspectionFacts) {
  const valuation = calculateDeviceValuation(result, facts);
  const deductions: BargainingDeduction[] = valuation.deductions;
  const asking = result.detectedPrice;
  const validPrice = asking !== undefined && Number.isFinite(asking) && asking > 0;
  const requestedDeduction = deductions.reduce((sum, entry) => sum + entry.amount, 0);
  const offer = validPrice ? Math.max(0, Math.round(asking - requestedDeduction)) : undefined;
  const saving = validPrice && offer !== undefined ? asking - offer : undefined;
  const message = offer === undefined ? '' : `Merhaba, ${catalogDeviceName(result)} cihazınızla ilgileniyorum. ${deductions.length ? `${deductions.map((entry) => entry.label.toLocaleLowerCase('tr-TR')).join(', ')} için öngörülen bakım ve değer kaybını göz önüne alarak` : 'İlanınızı değerlendirerek'} nakit ${listingMoney(offer)} teklif ediyorum. Uygunsa SecondCheck donanım kontrolüyle gün içinde elden teslim alabilirim.`;
  return { deductions, requestedDeduction, offer, saving, message, valuation };
}
