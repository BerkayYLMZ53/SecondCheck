import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useThemedStyles } from '../context/ThemeContext';
import type { ThemeColors } from '../context/ThemeContext';
import type { ParsedListingResult } from '../types/listing';
import type { InspectionFacts, LabResults, ReportDetails, TestStatus } from '../types/inspection';
import { generatePdfReport } from '../utils/generatePdfReport';
import { STATUS_LABELS } from '../utils/inspection';

export default function ExportReportButton({ result, checked, lab, facts, onFactsChange }: {
  result: ParsedListingResult; checked: ReadonlySet<number>; lab: LabResults; facts: InspectionFacts; onFactsChange: (value: InspectionFacts) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const [details, setDetails] = useState<ReportDetails>({ color: '', imeiLast4: '' });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState(false);
  const checks = [{ key: 'trueTone', label: 'True Tone' }, { key: 'biometrics', label: 'Face ID / parmak izi' }, { key: 'cameras', label: 'Kameralar' }, { key: 'liquid', label: 'Sıvı teması' }, { key: 'caseCondition', label: 'Kasa durumu' }] as const;
  const exportReport = async () => {
    if (busy) return;
    setBusy(true); setFeedback(''); setError(false);
    try {
      const code = await generatePdfReport({ result, checked, lab, facts, details });
      setFeedback(Platform.OS === 'web' ? `${code}: Rapor açıldı. “Yazdır / PDF olarak kaydet” ile PDF olarak kaydedebilirsiniz.` : `${code}: PDF oluşturuldu; kaydetme / paylaşım menüsünü kullanın.`);
    } catch (reason) { setError(true); setFeedback(reason instanceof Error ? reason.message : 'PDF oluşturulamadı. Yeniden deneyin.'); }
    finally { setBusy(false); }
  };
  return <View style={styles.panel} testID="pdf-report-section">
    <Text accessibilityRole="header" style={styles.heading}>Rapor bilgileri & fiziksel kontroller</Text>
    <Text style={styles.caption}>Kontrol edilmemiş bir madde raporda “Kontrol edilmedi” görünür. True Tone bulunmayan modellerde “Uygulanamaz” seçin. Sıvı temasında “Sağlam”, gözlemlediğiniz alanda temas izi olmadığı anlamına gelir.</Text>
    <Text style={styles.text}>Renk (isteğe bağlı)</Text>
    <TextInput testID="report-color" accessibilityLabel="Cihaz rengi" maxLength={60} value={details.color} onChangeText={(color) => setDetails((current) => ({ ...current, color }))} placeholder="Örn. Sierra Blue" style={styles.input} placeholderTextColor={styles.caption.color} />
    <Text style={styles.text}>IMEI son 4 hanesi (isteğe bağlı)</Text>
    <TextInput testID="report-imei" accessibilityLabel="IMEI son dört hanesi" inputMode="numeric" maxLength={4} value={details.imeiLast4} onChangeText={(value) => setDetails((current) => ({ ...current, imeiLast4: value.replace(/\D/g, '').slice(0, 4) }))} placeholder="1234" style={styles.input} placeholderTextColor={styles.caption.color} />
    {details.imeiLast4.length > 0 && details.imeiLast4.length !== 4 && <Text style={styles.caption}>Rapor için tam 4 hane girin; eksik giriş rapora alınmaz.</Text>}
    {checks.map(({ key, label }) => <View key={key} style={styles.check}>
      <Text style={styles.text}>{label}</Text><View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.row}>
        {(['pending', 'pass', 'fail', 'unsupported'] as TestStatus[]).map((status) => <Pressable key={status} testID={`physical-${key}-${status}`} accessibilityRole="radio" accessibilityLabel={`${label}: ${STATUS_LABELS[status]}`} accessibilityState={{ checked: facts[key] === status }}
          onPress={() => onFactsChange({ ...facts, [key]: status, ...(key === 'caseCondition' ? { cosmeticDamage: status === 'fail', visualInspection: undefined } : {}) })} style={[styles.option, facts[key] === status && styles.selected]}><Text style={styles.text}>{status === 'unsupported' ? 'Uygulanamaz' : STATUS_LABELS[status]}</Text></Pressable>)}
      </View></View>)}
    <Pressable testID="listing-export-pdf" accessibilityRole="button" disabled={busy || !result.matchedDevice || result.matchedDevice.releaseYear === 0} accessibilityState={{ disabled: busy || !result.matchedDevice || result.matchedDevice.releaseYear === 0, busy }}
      onPress={() => { void exportReport(); }} style={[styles.button, busy && { opacity: 0.5 }]}><Text style={styles.buttonText}>{busy ? 'Rapor hazırlanıyor…' : '📄 PDF Ekspertiz Raporunu İndir'}</Text></Pressable>
    {!!feedback && <Text style={error ? styles.error : styles.caption} accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite">{feedback}</Text>}
    <Text style={styles.caption}>Eksik kontroller de açıkça raporlanır. Rapor kimliği yerel ve benzersizdir; çevrimiçi doğrulama veya resmi servis sertifikası değildir.</Text>
  </View>;
}
const createStyles = (c: ThemeColors) => StyleSheet.create({
  panel: { padding: 16, gap: 13, backgroundColor: c.inset, borderColor: c.cardBorder, borderWidth: 1, borderRadius: 16 }, heading: { color: c.textPrimary, fontSize: 17, fontWeight: '800' }, caption: { color: c.textSecondary, fontSize: 12, lineHeight: 20 },
  text: { color: c.textPrimary, fontSize: 13, lineHeight: 21 }, input: { minHeight: 46, padding: 12, color: c.textPrimary, backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 10 },
  check: { gap: 8 }, row: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' }, option: { padding: 10, minHeight: 44, justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: c.cardBorder, backgroundColor: c.cardBg }, selected: { borderColor: c.cyan, backgroundColor: c.accentSoft },
  button: { backgroundColor: c.accent, minHeight: 50, padding: 14, alignItems: 'center', borderRadius: 12 }, buttonText: { color: c.onAccent, fontSize: 14, fontWeight: '700', textAlign: 'center' }, error: { color: c.dangerText, fontSize: 13, lineHeight: 21 },
});
