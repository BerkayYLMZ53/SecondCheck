import type { InspectionFacts } from '../types/inspection';
import type { ParsedListingResult } from '../types/listing';
import { catalogDeviceName, listingMoney } from './listingAnalysisReport';

export interface BargainingDeduction { id: string; label: string; amount: number }
export function calculateBargain(result: ParsedListingResult, facts: InspectionFacts) {
  const deductions: BargainingDeduction[] = [];
  if (result.detectedBattery !== undefined && result.detectedBattery >= 0 && result.detectedBattery < 80) deductions.push({ id: 'battery', label: 'Pil sağlığı %80 altında', amount: 2500 });
  if (facts.missingDocuments) deductions.push({ id: 'documents', label: 'Kutu ve fatura yok', amount: 1000 });
  if (facts.screenReplaced || facts.trueTone === 'fail') deductions.push({ id: 'screen', label: 'Değişen ekran / True Tone eksikliği', amount: 4000 });
  if (facts.cosmeticDamage) deductions.push({ id: 'cosmetic', label: 'Kozmetik çizik / ezilme', amount: 1500 });
  const asking = result.detectedPrice;
  const validPrice = asking !== undefined && Number.isFinite(asking) && asking > 0;
  const requestedDeduction = deductions.reduce((sum, entry) => sum + entry.amount, 0);
  const offer = validPrice ? Math.max(0, Math.round(asking - requestedDeduction)) : undefined;
  const saving = validPrice && offer !== undefined ? asking - offer : undefined;
  const message = offer === undefined ? '' : `Merhaba, ${catalogDeviceName(result)} cihazınızla ilgileniyorum. ${deductions.length ? `${deductions.map((entry) => entry.label.toLocaleLowerCase('tr-TR')).join(', ')} için öngörülen bakım ve değer kaybını göz önüne alarak` : 'İlanınızı değerlendirerek'} nakit ${listingMoney(offer)} teklif ediyorum. Uygunsa SecondCheck donanım kontrolüyle gün içinde elden teslim alabilirim.`;
  return { deductions, requestedDeduction, offer, saving, message };
}
