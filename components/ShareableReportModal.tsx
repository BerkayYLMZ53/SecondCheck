import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { SvgXml } from 'react-native-svg';
import { Download, Share2, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import type { ThemeColors } from '../context/ThemeContext';
import { buildReportCardSvg, reportCardSize } from '../utils/shareableReport';
import type { ReportCardFormat, ShareableReportSnapshot } from '../utils/shareableReport';
import { prepareReportImage, releaseReportImage, saveReportImage, shareReportImage } from '../utils/reportImage';
import type { ReportImageArtifact } from '../utils/reportImage.types';

export default function ShareableReportModal({ snapshot, onClose }: { snapshot: ShareableReportSnapshot; onClose: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [format, setFormat] = useState<ReportCardFormat>('story');
  const [attempt, setAttempt] = useState(0);
  const [layoutReady, setLayoutReady] = useState(false);
  const [artifact, setArtifact] = useState<ReportImageArtifact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState<'save' | 'share' | null>(null);
  const svgRef = useRef<Svg | null>(null);
  const dimensions = reportCardSize(format);
  const previewWidth = Math.max(120, Math.min(330, width - 76));
  const previewHeight = previewWidth * dimensions.height / dimensions.width;
  const svg = useMemo(() => buildReportCardSvg(snapshot, format), [snapshot, format]);
  const canPrepare = Platform.OS === 'web' || layoutReady;
  const capture = useCallback((imageWidth: number, imageHeight: number) => new Promise<string>((resolve, reject) => {
    const instance = svgRef.current;
    if (!instance) { reject(new Error('Görsel önizlemesi henüz hazır değil.')); return; }
    const timer = setTimeout(() => reject(new Error('Görsel hazırlanamadı. Yeniden deneyin.')), 7000);
    try { instance.toDataURL((base64) => { clearTimeout(timer); resolve(base64); }, { width: imageWidth, height: imageHeight }); }
    catch { clearTimeout(timer); reject(new Error('PNG görseli oluşturulamadı.')); }
  }), []);

  useEffect(() => {
    if (!canPrepare) return;
    let cancelled = false;
    let generated: ReportImageArtifact | undefined;
    const filename = `secondcheck-${snapshot.deviceId}-${format}-${snapshot.createdAt.replace(/\D/g, '')}-${attempt}.png`;
    void prepareReportImage(svg, dimensions.width, dimensions.height, filename, capture).then((value) => {
      generated = value;
      if (cancelled) void releaseReportImage(value); else setArtifact(value);
    }).catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Görsel hazırlanamadı.'); });
    return () => { cancelled = true; if (generated) void releaseReportImage(generated); };
  }, [svg, format, snapshot.deviceId, snapshot.createdAt, dimensions.width, dimensions.height, attempt, capture, canPrepare]);

  function changeFormat(next: ReportCardFormat) {
    if (busy || next === format) return;
    setArtifact(null); setLayoutReady(false); setFeedback(null); setError(null); setAttempt((value) => value + 1); setFormat(next);
  }

  async function perform(action: 'save' | 'share') {
    if (!artifact || busy) return;
    setBusy(action); setError(null); setFeedback(null);
    try {
      if (action === 'save') { await saveReportImage(artifact); setFeedback(Platform.OS === 'web' ? 'PNG indirmesi başlatıldı.' : 'Ekspertiz kartı galerinize kaydedildi.'); }
      else { const outcome = await shareReportImage(artifact, snapshot.plainText); setFeedback(outcome === 'cancelled' ? 'Paylaşım iptal edildi.' : 'Paylaşım menüsü açıldı.'); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'İşlem tamamlanamadı. Lütfen tekrar deneyin.'); }
    finally { setBusy(null); }
  }

  return <Modal visible transparent animationType={Platform.OS === 'web' ? 'none' : 'fade'} accessibilityLabel="Paylaşılabilir ekspertiz kartı"
    onRequestClose={() => { if (!busy) onClose(); }}>
    <View style={[styles.overlay, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.sheet} testID="shareable-report-modal" accessibilityViewIsModal>
        <View style={styles.header}><View style={styles.grow}><Text accessibilityRole="header" style={styles.title}>Ekspertiz kartınız</Text><Text style={styles.caption}>Story veya kare formatında PNG</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Ekspertiz paylaşımını kapat" disabled={busy !== null} accessibilityState={{ disabled: busy !== null }} onPress={onClose} style={styles.close}><X size={21} color={colors.textPrimary} /></Pressable></View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.formats}>
            {([{ id: 'story', label: 'Story · 9:16' }, { id: 'square', label: 'Kare · 1:1' }] as const).map((item) =>
              <Pressable key={item.id} testID={`report-format-${item.id}`} accessibilityRole="button" accessibilityState={{ selected: format === item.id, disabled: busy !== null }} aria-pressed={format === item.id}
                disabled={busy !== null} onPress={() => changeFormat(item.id)} style={[styles.format, format === item.id && styles.selectedFormat]}><Text style={styles.formatText}>{item.label}</Text></Pressable>)}
          </View>
          <View style={styles.preview} testID="report-card-preview" accessibilityLabel={`${snapshot.deviceName}, ${snapshot.trust.score} puan, ${snapshot.trust.grade}`}>
            {artifact && Platform.OS === 'web'
              ? <Image testID="report-png-preview" accessibilityLabel="PNG ekspertiz kartı" source={{ uri: artifact.uri }} style={{ width: previewWidth, height: previewHeight }} resizeMode="contain" />
              : <SvgXml key={`${format}:${attempt}`} xml={svg} override={{ ref: svgRef, width: previewWidth, height: previewHeight, onLayout: () => setLayoutReady(true) }} />}
          </View>
          <Text style={styles.caption} testID="report-image-size">{dimensions.width} × {dimensions.height} px • {snapshot.completed}/{snapshot.total} kontrol işaretlendi</Text>
          {!artifact && !error && <Text style={styles.caption} accessibilityLiveRegion="polite">PNG hazırlanıyor…</Text>}
          <Text style={styles.caption}>Damga, uygulamada oluşturulan kullanıcı kontrol kaydını belirtir. Fiziksel servis doğrulaması veya garanti belgesi değildir.</Text>
          <View style={styles.actions}>
            <Pressable testID="share-save-png" accessibilityRole="button" accessibilityState={{ disabled: !artifact || busy !== null, busy: busy === 'save' }} disabled={!artifact || busy !== null}
              onPress={() => { void perform('save'); }} style={[styles.primary, (!artifact || busy !== null) && styles.disabled]}><Download size={18} color={colors.onAccent} /><Text style={styles.buttonText}>{busy === 'save' ? 'Kaydediliyor…' : 'PNG Olarak Kaydet'}</Text></Pressable>
            <Pressable testID="share-report-image" accessibilityRole="button" accessibilityState={{ disabled: !artifact || busy !== null, busy: busy === 'share' }} disabled={!artifact || busy !== null}
              onPress={() => { void perform('share'); }} style={[styles.secondary, (!artifact || busy !== null) && styles.disabled]}><Share2 size={18} color={colors.cyan} /><Text style={styles.secondaryText}>{busy === 'share' ? 'Paylaşılıyor…' : 'Paylaş'}</Text></Pressable>
          </View>
          {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
          {error && !artifact && <Pressable accessibilityRole="button" onPress={() => { setLayoutReady(false); setError(null); setAttempt((value) => value + 1); }} style={styles.secondary}><Text style={styles.secondaryText}>Görseli yeniden hazırla</Text></Pressable>}
          {feedback && <Text style={styles.caption} accessibilityLiveRegion="polite">{feedback}</Text>}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.overlay, paddingHorizontal: 14 },
  sheet: { width: '100%', maxWidth: 500, maxHeight: '100%', flexShrink: 1, borderRadius: 24, backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  grow: { flex: 1, minWidth: 0 }, title: { color: colors.textPrimary, fontSize: 20, lineHeight: 28, fontWeight: '800' },
  caption: { color: colors.textSecondary, fontSize: 11, lineHeight: 18 }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexShrink: 1 }, content: { padding: 18, gap: 14 }, formats: { flexDirection: 'row', gap: 10 },
  format: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', minHeight: 44 },
  selectedFormat: { backgroundColor: colors.accentSoft, borderColor: colors.accent }, formatText: { color: colors.textPrimary, fontSize: 12, fontWeight: '700' },
  preview: { alignSelf: 'center', borderRadius: 14, overflow: 'hidden', backgroundColor: '#0b0f19' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  primary: { flexGrow: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 13, minHeight: 48, borderRadius: 12, backgroundColor: colors.accent },
  secondary: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 13, minHeight: 48, borderRadius: 12, backgroundColor: colors.accentSoft },
  buttonText: { color: colors.onAccent, fontSize: 12, lineHeight: 19, fontWeight: '700' }, secondaryText: { color: colors.cyan, fontSize: 12, lineHeight: 19, fontWeight: '700' },
  disabled: { opacity: 0.45 }, error: { color: colors.dangerText, fontSize: 12, lineHeight: 20 },
});
