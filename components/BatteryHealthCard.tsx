import { StyleSheet, Text, TextInput, View } from 'react-native';
import { BatteryCharging } from 'lucide-react-native';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import type { ThemeColors } from '../context/ThemeContext';
import type { ParsedListingResult } from '../types/listing';
import type { InspectionFacts } from '../types/inspection';
import { calculateDeviceValuation } from '../utils/deviceValuation';
import { listingMoney } from '../utils/listingAnalysisReport';
import { triggerSelection, triggerWarning } from '../utils/haptics';

export default function BatteryHealthCard({ result, facts, value, invalid, onChange }: {
  result: ParsedListingResult; facts: InspectionFacts; value: string; invalid: boolean; onChange: (value: string) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const valuation = calculateDeviceValuation(result, facts);
  const { battery } = valuation;
  const color = battery.condition === 'critical' ? colors.dangerText
    : battery.condition === 'moderate' ? colors.warningText : battery.condition === 'ideal' ? colors.successText : colors.textSecondary;
  return <View style={styles.card} testID="battery-health-card">
    <View style={styles.row}><BatteryCharging size={23} color={colors.cyan} /><Text accessibilityRole="header" style={styles.heading}>Pil Sağlığı & Değişim Maliyeti</Text></View>
    <Text style={styles.label}>Pil sağlığı (%)</Text>
    <TextInput testID="battery-health-input" accessibilityLabel="Pil sağlığı yüzdesi" inputMode="numeric" keyboardType="number-pad" maxLength={3}
      value={value} onChangeText={(next) => {
        if (/^\d{1,3}$/.test(next) && Number(next) <= 100 && (value === '' || Number(next) !== Number(value))) {
          void triggerSelection();
          if (Number(next) < 80 && (value === '' || Number(value) >= 80)) void triggerWarning();
        }
        onChange(next);
      }} placeholder="Örn. 82" placeholderTextColor={colors.textSecondary} style={styles.input} />
    {invalid ? <Text accessibilityRole="alert" style={styles.error}>0 ile 100 arasında bir tam sayı girin.</Text>
      : <Text testID="battery-condition" style={[styles.label, { color }]} accessibilityLiveRegion="polite">{battery.label}</Text>}
    <Text style={styles.caption}>Tahmini orijinal batarya değişim bütçesi: {battery.replacementCost === undefined ? 'Bu model için tahmin yok' : listingMoney(battery.replacementCost)}</Text>
    <View style={styles.summary}>
      <Text style={styles.label}>Ham piyasa değeri: {valuation.marketValue === undefined ? 'Referans yok' : listingMoney(valuation.marketValue)}</Text>
      <Text style={styles.label}>Batarya kesintisi: −{listingMoney(battery.deduction)}</Text>
      <Text style={styles.label}>Kusur & batarya kesintileri: −{listingMoney(valuation.totalDeduction ?? 0)}</Text>
      <Text style={styles.caption}>Tavsiye Edilen Adil Alım/Teklif Fiyatı</Text>
      <Text testID="battery-fair-offer" style={styles.offer}>{invalid ? 'Geçerli pil yüzdesi gerekli' : valuation.fairOffer === undefined ? 'Referans yok' : listingMoney(valuation.fairOffer)}</Text>
    </View>
    <Text style={styles.caption}>%85 altında batarya bütçesi bir kez düşülür. Tutarlar model yılı/serisine dayalı tahminlerdir; güncel yetkili servis teklifi değildir. 4-7 ay, yüzdeye dayalı bir senaryodur; kalan ömür veya arıza ölçümü değildir.</Text>
  </View>;
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  card: { padding: 16, gap: 12, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, backgroundColor: c.inset },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' }, heading: { flex: 1, color: c.textPrimary, fontSize: 17, lineHeight: 24, fontWeight: '800' },
  input: { minHeight: 48, padding: 12, borderRadius: 12, color: c.textPrimary, backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.cardBorder, fontSize: 18 },
  label: { color: c.textPrimary, fontSize: 13, lineHeight: 22 }, caption: { color: c.textSecondary, fontSize: 12, lineHeight: 20 },
  summary: { padding: 14, borderRadius: 12, backgroundColor: c.accentSoft, gap: 8 }, offer: { color: c.cyan, fontWeight: '800', fontSize: 26, lineHeight: 34 },
  error: { color: c.dangerText, fontSize: 13, lineHeight: 20 },
});
