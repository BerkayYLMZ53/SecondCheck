import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckSquare, Copy, FileCheck, RotateCcw, Share2, ShieldCheck, Square } from 'lucide-react-native';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import type { ThemeColors } from '../context/ThemeContext';
import type { ParsedListingResult } from '../types/listing';
import { compareDevicePrice } from '../utils/deviceListingParser';
import { buildListingAnalysisReport, catalogDeviceName, listingMoney } from '../utils/listingAnalysisReport';
import type { ListingAnalysisReport } from '../utils/listingAnalysisReport';
import { copyReportText } from '../utils/clipboard';
import { calculateTrustScore } from '../utils/trustScore';
import { playHaptic } from '../utils/haptics';
import { createShareableReport } from '../utils/shareableReport';
import type { ShareableReportSnapshot } from '../utils/shareableReport';
import TrustScoreGauge from './TrustScoreGauge';
import DeviceTeardownView from './DeviceTeardownView';
import ShareableReportModal from './ShareableReportModal';

interface Props {
  result: ParsedListingResult;
  title?: string;
  active?: boolean;
}

export default function ListingAnalysisCard(props: Props) {
  // A changed device or analysis must not inherit another inspection's ticks.
  return <AnalysisDetails key={JSON.stringify([props.result, props.title])} {...props} />;
}

function AnalysisDetails({ result, title = '', active = true }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [checked, setChecked] = useState<ReadonlySet<number>>(() => new Set());
  const [report, setReport] = useState<ListingAnalysisReport | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');
  const [shareSnapshot, setShareSnapshot] = useState<ShareableReportSnapshot | null>(null);
  const assessment = useMemo(() => calculateTrustScore(result, checked), [result, checked]);
  const lastFeedback = useRef('neutral');
  const device = result.matchedDevice;
  const comparison = compareDevicePrice(device, result.detectedPrice);
  const feedback = comparison?.status === 'PAHALI' || (assessment.available && (assessment.score < 65 || result.flags.hasChanges || (result.detectedBattery !== undefined && result.detectedBattery < 80)))
    ? 'warning' : assessment.available && assessment.score >= 85 ? 'success' : 'neutral';
  useEffect(() => {
    if (!active) return;
    if (feedback !== lastFeedback.current && feedback !== 'neutral') void playHaptic(feedback);
    lastFeedback.current = feedback;
  }, [feedback, active]);
  if (!device) return null;
  const total = device.criticalChecks.length;
  const completed = device.criticalChecks.filter((_, index) => checked.has(index)).length;
  const average = device.estimatedPriceBand.avgTry;
  const difference = result.detectedPrice === undefined || average <= 0 ? undefined : result.detectedPrice - average;
  const verdict = comparison?.status === 'FIRSAT'
    ? { label: '🔥 Fırsat Fiyat', backgroundColor: colors.successBg, color: colors.successText }
    : comparison?.status === 'PAHALI'
      ? { label: '⚠️ Piyasa Üstü', backgroundColor: colors.dangerBg, color: colors.dangerText }
      : comparison ? { label: '✅ Normal Piyasa', backgroundColor: colors.accentSoft, color: colors.cyan } : null;
  const batteryWarning = result.detectedBattery !== undefined && result.detectedBattery < 80;

  function toggle(index: number) {
    if (!checked.has(index)) void playHaptic('light');
    setChecked((previous) => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
    setReport(null);
    setCopyState('idle');
  }

  async function copy() {
    if (!report) return;
    setCopyState('copying');
    try {
      setCopyState(await copyReportText(report.plainText) ? 'copied' : 'error');
    } catch { setCopyState('error'); }
  }

  return (
    <View style={styles.card} testID="listing-analysis-card">
      <View style={styles.headingRow}>
        <View style={styles.headingIcon}><ShieldCheck size={25} color={colors.cyan} /></View>
        <View style={styles.grow}>
          <Text style={styles.eyebrow}>İLAN ANALİZİ TAMAMLANDI</Text>
          <Text accessibilityRole="header" style={styles.deviceName} testID="listing-device-name">{catalogDeviceName(result)}</Text>
        </View>
      </View>
      <View style={styles.chips}>
        {result.detectedStorage && <Text style={styles.chip}>{result.detectedStorage.replace(/(\d)(GB|TB)$/, '$1 $2')}</Text>}
        {result.detectedBattery !== undefined && (
          <Text style={[styles.chip, batteryWarning && styles.warningChip]}>Pil sağlığı %{result.detectedBattery}{batteryWarning ? ' • Kontrol edin' : ''}</Text>
        )}
        {device.releaseYear === 0 && <Text style={[styles.chip, styles.warningChip]}>Konsept kaydı</Text>}
      </View>

      <TrustScoreGauge assessment={assessment} active={active && !shareSnapshot} />

      <View style={styles.pricePanel}>
        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Text style={styles.caption}>İlan Fiyatı</Text>
            <Text style={styles.amount} testID="listing-asking-price">{result.detectedPrice === undefined ? 'Belirtilmedi' : listingMoney(result.detectedPrice)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.caption}>Piyasa Ortalaması</Text>
            <Text style={styles.referenceAmount} testID="listing-market-price">{average > 0 ? listingMoney(average) : 'Referans yok'}</Text>
          </View>
        </View>
        {verdict && (
          <View style={[styles.verdict, { backgroundColor: verdict.backgroundColor }]}>
            <Text style={[styles.verdictText, { color: verdict.color }]} testID="listing-price-verdict">{verdict.label}</Text>
          </View>
        )}
        {difference !== undefined && comparison && (
          <Text style={styles.body} testID="listing-price-difference">
            {difference === 0 ? 'İlan fiyatı katalog referansıyla aynı.'
              : `Referanstan ${listingMoney(Math.abs(difference))} (%${Math.abs(comparison.differencePercentage).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}) ${difference < 0 ? 'daha düşük' : 'daha yüksek'}.`}
          </Text>
        )}
        {!comparison && <Text style={styles.body}>{average > 0 ? 'Fiyat belirtilmediği için karşılaştırma yapılamadı.' : 'Bu cihaz için doğrulanmış fiyat referansı bulunmuyor.'}</Text>}
        <Text style={styles.caption}>Piyasa ortalaması tahmini katalog referansıdır; canlı ilan ortalaması değildir.</Text>
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>İlanın söyledikleri</Text>
        <View style={styles.chips}>
          <Text style={styles.chip}>Kutu: {result.flags.hasBox ? 'Var' : 'Yok / belirtilmedi'}</Text>
          <Text style={styles.chip}>Fatura: {result.flags.hasInvoice ? 'Var' : 'Yok / belirtilmedi'}</Text>
          <Text style={styles.chip}>Garanti: {result.flags.hasWarranty ? 'Var olarak belirtilmiş' : 'Yok / belirtilmedi'}</Text>
          <Text style={[styles.chip, result.flags.hasChanges && styles.warningChip]}>{result.flags.hasChanges ? '⚠️ Değişim / onarım beyanı' : 'Değişim beyanı yok'}</Text>
        </View>
        {result.flags.changeNotes.map((note) => <Text key={note} style={styles.warningText}>• {note}</Text>)}
        <Text style={styles.caption}>Bilgi yokluğu, kutunun veya garantinin kesin olarak bulunmadığı anlamına gelmez. İlan beyanlarını satıcıyla doğrulayın.</Text>
      </View>

      {device.releaseYear > 0 && <DeviceTeardownView device={device} active={active && !shareSnapshot} />}

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Modele özel kronik sorunlar</Text>
        <Text style={styles.caption}>Üretici kayıtları ve satın alırken kontrol edilmesi gereken riskler.</Text>
        {device.chronicIssues.map((issue, index) => (
          <View key={`${index}:${issue}`} style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text><Text style={[styles.body, styles.grow]}>{issue}</Text>
          </View>
        ))}
        {device.chronicIssues.length === 0 && <Text style={styles.body}>Bu modele ait kayıt bulunmuyor.</Text>}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text accessibilityRole="header" style={[styles.sectionTitle, styles.grow]}>Kritik kontrol listesi</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="İlan kontrol listesini sıfırla" disabled={completed === 0}
            accessibilityState={{ disabled: completed === 0 }}
            onPress={() => { setChecked(new Set()); setReport(null); setCopyState('idle'); }}
            style={({ pressed }) => [styles.reset, completed === 0 && styles.disabled, pressed && styles.pressed]}>
            <RotateCcw size={16} color={colors.cyan} /><Text style={styles.linkText}>Sıfırla</Text>
          </Pressable>
        </View>
        <Text style={styles.body} accessibilityLiveRegion="polite" testID="listing-check-progress">{completed} / {total} kontrol işaretlendi</Text>
        <View style={styles.track} accessibilityRole="progressbar" accessibilityLabel="İlan kritik kontrolleri"
          accessibilityValue={{ min: 0, max: total || 1, now: completed }}>
          <View style={[styles.fill, { width: `${total ? completed / total * 100 : 0}%` }]} />
        </View>
        {device.criticalChecks.map((check, index) => (
          <Pressable key={`${device.id}:${index}`} testID={`listing-check-${index}`} accessibilityRole="checkbox"
            accessibilityLabel={check} accessibilityState={{ checked: checked.has(index) }} aria-checked={checked.has(index)}
            onPress={() => toggle(index)}
            style={({ pressed }) => [styles.checkRow, checked.has(index) && styles.checkedRow, pressed && styles.pressed]}>
            <View style={styles.checkbox}>{checked.has(index) ? <CheckSquare size={23} color={colors.successText} /> : <Square size={23} color={colors.muted} />}</View>
            <Text style={[styles.body, styles.grow, checked.has(index) && styles.checkedText]}>{check}</Text>
          </Pressable>
        ))}
        <Text style={styles.caption}>Yalnızca yerinde kontrol ettiğiniz maddeleri işaretleyin. İşaretsiz maddeler arıza olarak değerlendirilmez.</Text>
      </View>

      <Pressable testID="listing-create-report" accessibilityRole="button" onPress={() => { setReport(buildListingAnalysisReport(result, checked, title)); setCopyState('idle'); }}
        style={({ pressed }) => [styles.reportButton, pressed && styles.pressed]}>
        <FileCheck size={20} color={colors.onAccent} /><Text style={styles.buttonText}>Ekspertiz Raporu Oluştur</Text>
      </Pressable>
      <Pressable testID="listing-share-card" accessibilityRole="button" accessibilityState={{ disabled: completed !== total || total === 0 || !assessment.available }}
        disabled={completed !== total || total === 0 || !assessment.available}
        onPress={() => setShareSnapshot(createShareableReport(result, checked, title))}
        style={({ pressed }) => [styles.shareButton, (completed !== total || total === 0 || !assessment.available) && styles.disabled, pressed && styles.pressed]}>
        <Share2 size={20} color={colors.cyan} /><Text style={styles.linkText}>Ekspertiz Kartı Paylaş</Text>
      </Pressable>
      {completed !== total && <Text style={styles.caption}>Story veya kare paylaşım kartı için {total - completed} kritik kontrol daha tamamlayın.</Text>}
      {shareSnapshot && <ShareableReportModal snapshot={shareSnapshot} onClose={() => setShareSnapshot(null)} />}
      {report && (
        <View style={styles.report} testID="listing-analysis-report">
          <View style={styles.sectionHeader}>
            <Text accessibilityRole="header" style={[styles.sectionTitle, styles.grow]}>Ekspertiz raporunuz</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="İlan ekspertiz raporunu kopyala" onPress={() => { void copy(); }}
              disabled={copyState === 'copying'} accessibilityState={{ disabled: copyState === 'copying', busy: copyState === 'copying' }}
              style={({ pressed }) => [styles.reset, pressed && styles.pressed]}>
              <Copy size={16} color={colors.cyan} /><Text style={styles.linkText}>{copyState === 'copied' ? 'Kopyalandı' : copyState === 'copying' ? 'Kopyalanıyor…' : 'Kopyala'}</Text>
            </Pressable>
          </View>
          <Text selectable style={styles.body}>{report.plainText}</Text>
          {copyState === 'error' && <Text style={styles.warningText} accessibilityRole="alert">Kopyalama tamamlanamadı. Rapor metnini seçerek kopyalayabilirsiniz.</Text>}
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { width: '100%', minWidth: 0, gap: 22, padding: 20, borderRadius: 22, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headingIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  grow: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.cyan, fontSize: 10, lineHeight: 16, letterSpacing: 1.1, fontWeight: '800' },
  deviceName: { color: colors.textPrimary, fontSize: 22, lineHeight: 29, fontWeight: '800', flexShrink: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { color: colors.textPrimary, backgroundColor: colors.chipBg, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7, overflow: 'hidden', fontSize: 12, lineHeight: 18, maxWidth: '100%', flexShrink: 1 },
  warningChip: { color: colors.warningText, backgroundColor: colors.warningBg, borderWidth: 1, borderColor: colors.warningBorder },
  warningText: { color: colors.warningText, fontSize: 13, lineHeight: 21 },
  pricePanel: { padding: 16, borderRadius: 16, gap: 12, backgroundColor: colors.inset, borderWidth: 1, borderColor: colors.cardBorder },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  metric: { flexGrow: 1, flexBasis: 180, minWidth: 0, gap: 5 },
  amount: { color: colors.textPrimary, fontSize: 27, lineHeight: 34, fontWeight: '800' },
  referenceAmount: { color: colors.textPrimary, fontSize: 22, lineHeight: 34, fontWeight: '600' },
  caption: { color: colors.textSecondary, fontSize: 12, lineHeight: 19, flexShrink: 1 },
  body: { color: colors.textPrimary, fontSize: 13, lineHeight: 22, flexShrink: 1 },
  verdict: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignSelf: 'flex-start', maxWidth: '100%' },
  verdictText: { fontSize: 14, lineHeight: 21, fontWeight: '800', flexShrink: 1 },
  section: { gap: 10 },
  sectionTitle: { color: colors.textPrimary, fontSize: 17, lineHeight: 24, fontWeight: '700', flexShrink: 1 },
  sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' },
  bulletRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  bullet: { color: colors.cyan, fontSize: 17, lineHeight: 22 },
  track: { height: 7, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.track },
  fill: { height: '100%', borderRadius: 4, backgroundColor: colors.successText },
  checkRow: { flexDirection: 'row', gap: 12, minHeight: 48, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.inset },
  checkedRow: { backgroundColor: colors.checkedBg, borderColor: colors.checkedBorder },
  checkedText: { color: colors.successText },
  checkbox: { width: 23, paddingTop: 1, flexShrink: 0 },
  reset: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  linkText: { color: colors.cyan, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  reportButton: { flexDirection: 'row', flexWrap: 'wrap', minHeight: 50, justifyContent: 'center', alignItems: 'center', gap: 9, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 13, backgroundColor: colors.accent },
  buttonText: { color: colors.onAccent, fontSize: 14, lineHeight: 21, fontWeight: '700', flexShrink: 1 },
  shareButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 14, minHeight: 50, borderRadius: 13, backgroundColor: colors.accentSoft },
  report: { gap: 12, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.inset },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
});
