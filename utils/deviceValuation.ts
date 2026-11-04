import { estimateBattery } from './batteryEstimator';
import type { InspectionFacts } from '../types/inspection';
import type { ParsedListingResult } from '../types/listing';

export interface ValuationDeduction { id: string; label: string; amount: number }

/** One deduction ledger for UI, bargaining, plain text and PDF. */
export function calculateDeviceValuation(result: ParsedListingResult, facts?: InspectionFacts) {
  const battery = estimateBattery(result.matchedDevice, result.detectedBattery);
  const deductions: ValuationDeduction[] = [];
  if (battery.deduction > 0) deductions.push({ id: 'battery', label: 'Tahmini orijinal batarya değişim bütçesi', amount: battery.deduction });
  if (facts?.missingDocuments) deductions.push({ id: 'documents', label: 'Kutu ve fatura yok', amount: 1000 });
  if (facts?.screenReplaced || facts?.trueTone === 'fail') deductions.push({ id: 'screen', label: 'Değişen ekran / True Tone eksikliği', amount: 4000 });
  if (facts?.cosmeticDamage) deductions.push({ id: 'cosmetic', label: 'Kozmetik çizik / ezilme', amount: 1500 });
  const requestedDeduction = deductions.reduce((sum, entry) => sum + entry.amount, 0);
  const reference = result.matchedDevice?.estimatedPriceBand.avgTry;
  const marketValue = result.matchedDevice?.releaseYear && reference !== undefined && Number.isFinite(reference) && reference > 0 ? reference : undefined;
  const totalDeduction = marketValue === undefined ? undefined : Math.min(marketValue, requestedDeduction);
  const fairOffer = marketValue === undefined || totalDeduction === undefined ? undefined : Math.max(0, Math.round(marketValue - totalDeduction));
  return { battery, deductions, requestedDeduction, marketValue, totalDeduction, fairOffer };
}
