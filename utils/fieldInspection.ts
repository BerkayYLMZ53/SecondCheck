import type { DeviceItem } from '../types/catalog';
import type { FieldInspectionReport, FieldStepId, FieldStepResult, FieldTestStep } from '../types/fieldInspection';

export const FIELD_STEP_IDS: readonly FieldStepId[] = ['buttons', 'screen', 'audio', 'camera', 'port', 'account'];
export function getFieldTestSteps(device: DeviceItem): FieldTestStep[] {
  const apple = device.brand === 'Apple';
  const trueTone = apple && device.releaseYear >= 2017;
  const instructions = [
    { id: 'buttons', title: 'Tuşlar ve Titreşim', instruction: 'Ses açma, kısma ve güç tuşlarına basın. Varsa sessiz anahtarını veya Eylem düğmesini deneyin. Titreşim motoru tok çalışıyor mu?' },
    { id: 'screen', title: trueTone ? 'True Tone ve Ekran' : 'Ekran ve Dokunmatik', instruction: trueTone ? 'Denetim Merkezini açıp parlaklığa basılı tutun. True Tone seçeneği çalışıyor mu? Ekranda leke var mı? True Tone tek başına orijinallik kanıtı değildir.' : 'Parlaklığı değiştirin. Tek renkli ekranda leke ve ölü piksel arayın; bütün kenarlarda dokunmatiği deneyin. Bu modelde True Tone aranmaz.' },
    { id: 'audio', title: 'Ahize ve Mikrofon', instruction: 'Sesli notlar uygulamasından kısa bir kayıt yapıp dinleyin. Ahizeyi ayrıca bir telefon görüşmesiyle deneyin. Kayıt ve görüşme sesi net mi?' },
    { id: 'camera', title: 'Kameralar ve Flaş', instruction: 'Modelde bulunan kameraları sırayla açın. Varsa sıfır nokta beş geniş açı, bir kat ve telefoto arasında geçin. Odaklama ve flaş sorunsuz mu?' },
    { id: 'port', title: 'Şarj Soketi ve Kasa', instruction: 'Uyumlu şarj kablosunu takın. Temassızlık var mı? Kasa köşelerinde açıklık görüyor musunuz? Soketi zorlamayın, kasaya baskı uygulamayın.' },
    { id: 'account', title: 'Hesap Çıkışı ve Sıfırlama', instruction: apple ? 'Satıcıyla birlikte iCloud hesabından çıkış yapıldığını ve Bul aktivasyon kilidinin kapatıldığını doğrulayın. Satıcının izni ve yedeği olmadan cihazı sıfırlamayın.' : 'Satıcıyla birlikte Google ve üretici hesaplarından çıkış yapıldığını, etkinleştirme kilidi kalmadığını doğrulayın. Satıcının izni ve yedeği olmadan cihazı sıfırlamayın.' },
  ] as const;
  const ordinals = ['Birinci', 'İkinci', 'Üçüncü', 'Dördüncü', 'Beşinci', 'Altıncı'];
  return instructions.map((step, index) => ({ ...step, spoken: `${ordinals[index]} adım. ${step.instruction}` }));
}

/** Only a complete six-step observation may replace the card's existing field report. */
export function buildFieldInspectionReport(results: readonly FieldStepResult[], date = new Date()): FieldInspectionReport {
  if (results.length !== FIELD_STEP_IDS.length || !Number.isFinite(date.getTime()) || results.some((result, index) => result.id !== FIELD_STEP_IDS[index] || !['pass', 'fail'].includes(result.status) || !Number.isFinite(Date.parse(result.answeredAt)))) throw new Error('Altı saha adımını sırayla tamamlayın.');
  return { results: results.map((result) => ({ ...result })), completedAt: date.toISOString(), source: 'guided-user-observation' };
}
