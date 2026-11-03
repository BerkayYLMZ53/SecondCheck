import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../context/ThemeContext';
import type { ThemeColors } from '../context/ThemeContext';
import type { ParsedListingResult } from '../types/listing';
import type { InspectionFacts } from '../types/inspection';
import { calculateBargain } from '../utils/bargaining';
import { listingMoney } from '../utils/listingAnalysisReport';
import { copyReportText } from '../utils/clipboard';

export default function BargainingAssistant({ result, facts, onChange }: {
  result: ParsedListingResult; facts: InspectionFacts; onChange: (facts: InspectionFacts) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const [copied, setCopied] = useState('');
  const bargain = calculateBargain(result, facts);
  const fields = [
    { key: 'missingDocuments', label: 'Kutu ve faturanın ikisi de yok', value: facts.missingDocuments },
    { key: 'screenReplaced', label: 'Ekran değişmiş', value: facts.screenReplaced },
    { key: 'cosmeticDamage', label: 'Kozmetik çizik / ezilme var', value: facts.cosmeticDamage },
  ] as const;
  return <View style={styles.panel} testID="bargaining-assistant">
    <Text accessibilityRole="header" style={styles.heading}>Akıllı pazarlık & karşı teklif</Text>
    <Text style={styles.caption}>Yalnızca doğruladığınız kusurları seçin. İlanda kutu/faturadan söz edilmemesi eksik olduklarını kanıtlamaz. Tutarlar sizin belirlediğiniz sabit pazarlık varsayımlarıdır; güncel yetkili servis tarifesi değildir.</Text>
    {fields.map((field) => <Pressable key={field.key} testID={`bargain-${field.key}`} accessibilityRole="checkbox" accessibilityLabel={field.label} accessibilityState={{ checked: field.value }} aria-checked={field.value}
      onPress={() => { onChange({ ...facts, [field.key]: !field.value }); setCopied(''); }} style={styles.option}><Text style={styles.text}>{field.value ? '☑' : '☐'} {field.label}</Text></Pressable>)}
    <Text style={styles.caption}>True Tone eksikliğini aşağıdaki fiziksel kontrollerden “Sorun var” olarak kaydedebilirsiniz. Ekran değişimiyle birlikte seçilse de tek ekran indirimi uygulanır.</Text>
    {bargain.deductions.map((entry) => <View key={entry.id} style={styles.row}><Text style={[styles.text, styles.grow]}>{entry.label}</Text><Text style={styles.text}>−{listingMoney(entry.amount)}</Text></View>)}
    {!bargain.deductions.length && <Text style={styles.caption}>Henüz indirim gerektiren bir kusur kaydı yok.</Text>}
    <View style={styles.summary}>
      <Text style={styles.text}>İlan fiyatı: {result.detectedPrice === undefined ? 'Belirtilmedi' : listingMoney(result.detectedPrice)}</Text>
      <Text style={styles.caption}>SecondCheck önerilen teklif</Text><Text style={styles.offer} testID="bargain-offer">{bargain.offer === undefined ? 'Fiyat gerekli' : listingMoney(bargain.offer)}</Text>
      <Text style={styles.text}>Gerekçelendirilmiş tasarruf: {bargain.saving === undefined ? '—' : listingMoney(bargain.saving)}</Text>
      {bargain.offer === 0 && <Text style={styles.caption}>İndirim toplamı ilan fiyatına ulaşıyor. Teklif alt sınırı 0 TL; cihazı ve hesabı yeniden değerlendirin.</Text>}
    </View>
    {bargain.message && <Text selectable style={styles.text} testID="bargain-message">{bargain.message}</Text>}
    <Pressable testID="bargain-copy" accessibilityRole="button" disabled={!bargain.message} accessibilityState={{ disabled: !bargain.message }} onPress={() => {
      void copyReportText(bargain.message).then((ok) => setCopied(ok ? 'Mesaj kopyalandı.' : 'Kopyalanamadı; metni seçerek kopyalayın.')).catch(() => setCopied('Kopyalanamadı; metni seçerek kopyalayın.'));
    }} style={[styles.button, !bargain.message && { opacity: 0.4 }]}><Text style={styles.buttonText}>Pazarlık mesajını kopyala</Text></Pressable>
    {!!copied && <Text style={styles.caption} accessibilityLiveRegion="polite">{copied}</Text>}
  </View>;
}
const createStyles = (c: ThemeColors) => StyleSheet.create({
  panel: { gap: 13, padding: 16, backgroundColor: c.inset, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 16 }, heading: { color: c.textPrimary, fontSize: 18, fontWeight: '800' },
  caption: { color: c.textSecondary, fontSize: 12, lineHeight: 20 }, text: { color: c.textPrimary, fontSize: 13, lineHeight: 22 }, option: { padding: 12, minHeight: 46, borderRadius: 12, backgroundColor: c.cardBg },
  row: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' }, grow: { flex: 1, minWidth: 140 }, summary: { gap: 8, padding: 15, backgroundColor: c.accentSoft, borderRadius: 13 }, offer: { color: c.cyan, fontSize: 27, fontWeight: '800' },
  button: { minHeight: 48, padding: 13, borderRadius: 12, backgroundColor: c.accent, alignItems: 'center' }, buttonText: { color: c.onAccent, fontWeight: '700', fontSize: 13 },
});
