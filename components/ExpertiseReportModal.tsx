import Pressable from './AnimatedPressable';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Check, Copy, FileCheck, X } from 'lucide-react-native';
import { copyReportText } from '../utils/clipboard';
import { useThemedStyles } from '../context/ThemeContext';
import type { ThemeColors } from '../context/ThemeContext';
import {
  REPORT_NOTE,
  REPORT_SEVERITIES,
  reportMoney,
} from '../utils/expertiseReport';
import type { ExpertiseReport } from '../utils/expertiseReport';
import { useDetailStyles } from './detailStyles';

interface Props {
  report: ExpertiseReport;
  onClose: () => void;
}

export default function ExpertiseReportModal({ report, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, shared } = useDetailStyles();
  const styles = useThemedStyles(createStyles);
  const [copyState, setCopyState] = useState<
    'idle' | 'copying' | 'copied' | 'error'
  >('idle');
  const severityColor = {
    low: colors.successText,
    medium: colors.amber,
    high: colors.dangerText,
  };
  const healthColor =
    report.health.tone === 'positive'
      ? colors.successText
      : report.health.tone === 'danger'
        ? colors.dangerText
        : report.health.tone === 'warning'
          ? colors.amber
          : colors.muted;
  const priceColor = !report.valuation
    ? colors.muted
    : report.valuation.assessment.status === 'bargain'
      ? colors.successText
      : report.valuation.assessment.status === 'overpriced'
        ? colors.dangerText
        : colors.accent;

  async function copyReport() {
    setCopyState('copying');
    try {
      const copied = await copyReportText(report.plainText);
      setCopyState(copied ? 'copied' : 'error');
    } catch {
      setCopyState('error');
    }
  }

  return (
    <Modal
      visible
      transparent
      animationType={Platform.OS === 'web' ? 'none' : 'fade'}
      accessibilityLabel="SecondCheck İkinci El Ekspertiz Raporu"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.overlay,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 16),
            paddingLeft: Math.max(insets.left, 12),
            paddingRight: Math.max(insets.right, 12),
          },
        ]}
      >
        <View
          testID="expertise-report-modal"
          accessibilityViewIsModal
          style={styles.sheet}
        >
          <View style={styles.header}>
            <View style={styles.headerText}>
              <FileCheck size={23} color={colors.accent} />
              <Text accessibilityRole="header" style={styles.heading}>
                SecondCheck İkinci El Ekspertiz Raporu
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Rapor penceresini kapat"
              onPress={onClose}
              style={styles.closeIcon}
            >
              <X size={22} color={colors.text} />
            </Pressable>
          </View>
          <View style={shared.pill}>
            <Text testID="report-date" style={shared.pillText}>
              Değerlendirme · {report.dateLabel}
            </Text>
          </View>
          <ScrollView
            testID="report-scroll"
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={shared.item}>
              <Text style={shared.caption}>CİHAZ & HEDEF ÖZELLİKLER</Text>
              <Text
                testID="report-device-name"
                selectable
                style={styles.device}
              >
                {report.deviceName}
              </Text>
              <Text style={shared.body}>Yapılandırma: {report.specs}</Text>
              <Text style={shared.body}>
                Kondisyon: {report.conditionLabel}
              </Text>
            </View>
            <View style={shared.item}>
              <Text style={shared.title}>Fiyat Değerlendirmesi</Text>
              <View
                style={[shared.pill, { backgroundColor: `${priceColor}15` }]}
              >
                <Text
                  testID="report-price-verdict"
                  style={[shared.pillText, { color: priceColor }]}
                >
                  {report.priceVerdict}
                </Text>
              </View>
              <View style={styles.metrics}>
                <View style={styles.metric}>
                  <Text style={shared.caption}>İlan Fiyatı</Text>
                  <Text testID="report-asking-price" style={styles.amount}>
                    {report.valuation
                      ? reportMoney(report.valuation.askingPrice)
                      : 'Henüz analiz edilmedi'}
                  </Text>
                </View>
                <View style={styles.metric}>
                  <Text style={shared.caption}>Piyasa Adil Değer</Text>
                  <Text style={styles.amount}>
                    {reportMoney(report.marketFairPrice)}
                  </Text>
                </View>
              </View>
              {report.valuation && (
                <>
                  {report.valuation.fair !== report.marketFairPrice && (
                    <Text testID="report-adjusted-fair" style={shared.title}>
                      Kondisyona Göre Adil Değer:{' '}
                      {reportMoney(report.valuation.fair)}
                    </Text>
                  )}
                  <Text style={shared.body}>
                    {report.valuation.assessment.adviceText}
                  </Text>
                </>
              )}
              {!report.valuation && (
                <Text style={shared.caption}>
                  İlan tutarını girip “Analiz Et & Değerlendir” ile fiyat
                  sonucunu rapora ekleyin.
                </Text>
              )}
            </View>
            <View style={shared.item}>
              <Text style={shared.title}>Test Skor Kartı</Text>
              <Text testID="report-test-score" style={styles.score}>
                {report.completed.length}/{report.total} Test Başarılı
              </Text>
              <Text style={shared.caption}>
                Kullanıcı beyanı: işaretli adımlar başarılı kabul edilir.
              </Text>
              {report.completed.map((item) => (
                <View key={item.id} style={styles.checkRow}>
                  <Check size={17} color={colors.successText} />
                  <Text style={[shared.body, styles.checkText]}>
                    {item.title}
                  </Text>
                </View>
              ))}
            </View>
            <View style={shared.item}>
              <Text style={shared.title}>Tespit Edilen Riskler</Text>
              <Text style={shared.caption}>
                Tamamlanmayan / doğrulanmayan kontroller
              </Text>
              {report.unchecked.length === 0 && (
                <Text style={shared.body}>İşaretsiz kontrol adımı yok.</Text>
              )}
              {report.unchecked.map((item) => (
                <View key={item.id} style={styles.riskItem}>
                  <Text style={[shared.title, { color: colors.amber }]}>
                    Doğrulanmadı: {item.title}
                  </Text>
                  <Text style={shared.caption}>{item.targetArea}</Text>
                  <Text style={shared.body}>{item.instruction}</Text>
                </View>
              ))}
              <Text style={shared.caption}>
                Model uyarıları · Bu cihazda teyit edilmedi
              </Text>
              {report.alerts.length === 0 && (
                <Text style={shared.body}>
                  Kayıtlı model uyarısı yok; bu, arızasızlık garantisi değildir.
                </Text>
              )}
              {report.alerts.map((issue) => (
                <View key={issue.id} style={styles.riskItem}>
                  <View
                    style={[
                      shared.pill,
                      { backgroundColor: `${severityColor[issue.severity]}18` },
                    ]}
                  >
                    <Text
                      style={[
                        shared.pillText,
                        { color: severityColor[issue.severity] },
                      ]}
                    >
                      {REPORT_SEVERITIES[issue.severity]} Risk
                    </Text>
                  </View>
                  <Text style={shared.title}>{issue.title}</Text>
                  <Text style={shared.body}>{issue.description}</Text>
                  <Text style={[shared.caption, { color: colors.successText }]}>
                    Tahmini Onarım / Bakım: {issue.estimatedRepairCost}
                  </Text>
                </View>
              ))}
            </View>
            <View style={[shared.item, { borderColor: healthColor }]}>
              <Text style={shared.title}>Genel Sağlık Notu</Text>
              <Text
                testID="report-health-score"
                style={[styles.score, { color: healthColor }]}
              >
                {report.health.score === null
                  ? '—'
                  : report.health.score.toLocaleString('tr-TR', {
                      minimumFractionDigits: 1,
                    })}{' '}
                / 10
              </Text>
              <Text style={[shared.title, { color: healthColor }]}>
                {report.health.label}
              </Text>
              <Text style={shared.caption}>
                Beyan / risk bazlı özet: %70 tamamlanan kontrol oranı + %30
                düşük model riski. Fiziksel sağlık ölçümü değildir.
              </Text>
            </View>
            <Text style={shared.caption}>{REPORT_NOTE}</Text>
            {copyState === 'error' && (
              <View style={shared.item}>
                <Text style={[shared.title, { color: colors.dangerText }]}>
                  Panoya erişilemedi. Aşağıdaki metni seçip kopyalayabilirsiniz.
                </Text>
                <Text
                  testID="report-copy-fallback"
                  selectable
                  style={shared.body}
                >
                  {report.plainText}
                </Text>
              </View>
            )}
          </ScrollView>
          <Text
            accessibilityLiveRegion="polite"
            style={[
              styles.copyStatus,
              {
                color:
                  copyState === 'error'
                    ? colors.dangerText
                    : colors.successText,
              },
            ]}
          >
            {copyState === 'copied'
              ? 'Rapor metni panoya kopyalandı.'
              : copyState === 'error'
                ? 'Kopyalama başarısız. Metin seçerek kopyalama seçeneği raporun sonunda.'
                : copyState === 'copying'
                  ? 'Kopyalanıyor…'
                  : 'WhatsApp veya forum için metin özeti hazır.'}
          </Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Metin Olarak Kopyala"
              accessibilityState={{ disabled: copyState === 'copying' }}
              aria-disabled={copyState === 'copying'}
              disabled={copyState === 'copying'}
              onPress={copyReport}
              style={({ pressed }) => [
                styles.copyButton,
                copyState === 'copying' && styles.disabled,
                pressed && shared.pressed,
              ]}
            >
              {copyState === 'copied' ? (
                <Check size={18} color={colors.onAccent} />
              ) : (
                <Copy size={18} color={colors.onAccent} />
              )}
              <Text style={styles.copyButtonText}>Metin Olarak Kopyala</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kapat"
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && shared.pressed,
              ]}
            >
              <Text style={shared.buttonText}>Kapat</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.overlay,
    },
    sheet: {
      width: '100%',
      maxWidth: 680,
      height: '90%',
      maxHeight: 900,
      padding: 16,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.cardBg,
      gap: 12,
    },
    header: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    headerText: { flex: 1, minWidth: 0, gap: 8 },
    heading: {
      color: colors.textPrimary,
      fontSize: 18,
      lineHeight: 25,
      fontWeight: '800',
      flexShrink: 1,
    },
    closeIcon: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scroll: { flex: 1, minHeight: 0 },
    content: { flexGrow: 1, gap: 14, paddingBottom: 40 },
    device: {
      color: colors.textPrimary,
      fontSize: 17,
      lineHeight: 25,
      fontWeight: '700',
      flexShrink: 1,
    },
    metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    metric: { flex: 1, flexBasis: 150, minWidth: 0, gap: 6 },
    amount: {
      color: colors.textPrimary,
      fontSize: 18,
      lineHeight: 26,
      fontWeight: '700',
      flexShrink: 1,
    },
    score: {
      color: colors.cyan,
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '800',
      flexShrink: 1,
    },
    checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    checkText: { flex: 1, minWidth: 0 },
    riskItem: {
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      paddingTop: 12,
    },
    actions: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
    copyButton: {
      flex: 1,
      minWidth: 0,
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.accent,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    copyButtonText: {
      color: colors.onAccent,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '700',
      flexShrink: 1,
      textAlign: 'center',
    },
    closeButton: {
      flex: 1,
      minWidth: 0,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.accentSoft,
    },
    copyStatus: { fontSize: 12, lineHeight: 19, flexShrink: 1 },
    disabled: { opacity: 0.6 },
  });
