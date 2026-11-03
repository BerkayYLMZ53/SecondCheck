import type { InspectionFacts, LabResults, LabTestId, TestStatus } from '../types/inspection';
import type { ParsedListingResult } from '../types/listing';

export const LAB_LABELS: Record<LabTestId, string> = { pixels: 'Ekran / ölü piksel', touch: 'Dokunmatik ızgara', audio: 'Hoparlör / ahize gözlemi', vibration: 'Titreşim motoru' };
export const STATUS_LABELS: Record<TestStatus, string> = { pending: 'Kontrol edilmedi', pass: 'Sağlam', fail: 'Sorun var', unsupported: 'Test edilemedi / uygulanamaz' };
export const LAB_IDS: readonly LabTestId[] = ['pixels', 'touch', 'audio', 'vibration'];
export function emptyLabResults(): LabResults {
  return Object.fromEntries(LAB_IDS.map((id) => [id, { status: 'pending', note: '' }])) as LabResults;
}
export function initialInspectionFacts(result: ParsedListingResult, text = ''): InspectionFacts {
  return {
    screenReplaced: result.flags.hasChanges && /ekran/i.test(result.flags.changeNotes.join(' ')),
    missingDocuments: /(?:kutu\s*(?:ve|&)\s*fatura\s*(?:yok|yoktur)|kutusuz\s*(?:ve\s*)?faturasız)/i.test(text),
    cosmeticDamage: false, caseCondition: 'pending',
    trueTone: 'pending', biometrics: 'pending', cameras: 'pending', liquid: 'pending',
  };
}
export function laboratoryComplete(lab: LabResults): boolean { return LAB_IDS.every((id) => lab[id].status !== 'pending'); }
