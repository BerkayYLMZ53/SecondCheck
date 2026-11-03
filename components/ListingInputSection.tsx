import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { ClipboardPaste, SearchCheck } from 'lucide-react-native';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import type { ThemeColors } from '../context/ThemeContext';
import { parseListingInput } from '../utils/listingInput';
import type { ListingInputResult } from '../utils/listingInput';
import type { ParsedListing } from '../utils/listingParser';
import ListingAnalysisCard from './ListingAnalysisCard';

interface Props {
  onParsed?: (listing: ParsedListing, title: string) => void;
  /** Full HTTPS address for native; same-origin /api/parse-listing on web. */
  apiEndpoint?: string;
}

export default function ListingInputSection({ onParsed, apiEndpoint }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState<ListingInputResult | null>(null);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => { requestId.current++; controller.current?.abort(); }, []);
  const disabled = !text.trim() || loading;

  async function analyze() {
    if (disabled) return;
    const id = ++requestId.current;
    controller.current?.abort();
    const activeController = new AbortController();
    controller.current = activeController;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    Keyboard.dismiss();
    try {
      const result = await parseListingInput(text, apiEndpoint, activeController.signal);
      if (id !== requestId.current) return;
      setAnalysis(result);
      setVersion((previous) => previous + 1);
      // The new card works independently of the legacy Product valuation flow.
      if (result.listing.product && !result.listing.matchedDevice) onParsed?.(result.listing, result.title);
    } catch (error) {
      if (id !== requestId.current || activeController.signal.aborted) return;
      setError(error instanceof Error ? error.message : 'İlan okunamadı. Başlığı ve açıklamayı yapıştırarak tekrar deneyin.');
    } finally {
      if (id === requestId.current) { setLoading(false); controller.current = null; }
    }
  }

  const listing = analysis?.listing;
  return (
    <View style={styles.section} testID="listing-input-section">
      <View style={styles.inputCard}>
        <View style={styles.headingRow}>
          <View style={styles.iconBox}><ClipboardPaste size={23} color={colors.cyan} /></View>
          <View style={styles.grow}>
            <Text style={styles.eyebrow}>SECONDCHECK AKILLI ANALİZ</Text>
            <Text accessibilityRole="header" style={styles.heading}>İlan Analiz &amp; Hızlı Ekspertiz</Text>
          </View>
        </View>
        <Text style={styles.body}>Linki veya ilan metnini yapıştırın. Cihazı eşleştirin, fiyatı karşılaştırın ve yerinde kontrol listenizi hazırlayın.</Text>
        <View style={[styles.inputRow, width < 560 && styles.stacked]}>
          <TextInput testID="listing-parser-input" accessibilityLabel="İlan bağlantısı, başlığı veya açıklaması"
            placeholder="Sahibinden, Dolap, Letgo bağlantısı veya ilan metni…" placeholderTextColor={colors.textSecondary}
            multiline maxLength={12000} textAlignVertical="top" value={text} editable={!loading}
            autoCapitalize="none" autoCorrect={false}
            onChangeText={(value) => {
              requestId.current++;
              controller.current?.abort();
              controller.current = null;
              setText(value); setAnalysis(null); setError(null); setLoading(false);
            }}
            style={styles.input} />
          <Pressable testID="parse-listing" accessibilityRole="button" accessibilityLabel="İlanı analiz et ve doğrula"
            accessibilityState={{ disabled, busy: loading }} disabled={disabled} onPress={() => { void analyze(); }}
            style={({ pressed }) => [styles.analyzeButton, width < 560 && styles.fullButton, disabled && styles.disabled, pressed && styles.pressed]}>
            {loading ? <ActivityIndicator size="small" color={colors.onAccent} /> : <SearchCheck size={20} color={colors.onAccent} />}
            <Text style={styles.buttonText}>{loading ? 'Analiz ediliyor…' : 'Analiz Et / Doğrula'}</Text>
          </Pressable>
        </View>
        <Text style={styles.caption}>İlan metni cihazınızda analiz edilir. Linkler için yalnızca ilan sayfasındaki bilgiler alınır.</Text>
        {loading && <Text accessibilityLiveRegion="polite" style={styles.caption}>İlan bilgileri hazırlanıyor…</Text>}
        {error && <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.errorText}>{error}</Text></View>}
      </View>

      {analysis && listing && (
        listing.matchedDevice
          ? <ListingAnalysisCard key={version} result={listing} title={analysis.title} />
          : <View style={styles.inputCard} testID="listing-unmatched-result" accessibilityLiveRegion="polite">
              <Text style={styles.resultHeading}>{listing.product ? listing.product.name : 'Cihaz eşleştirilemedi'}</Text>
              {listing.price !== null && <Text style={styles.body}>İlan fiyatı: {listing.price.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL</Text>}
              <Text style={styles.body}>{listing.product
                ? 'Ürün mevcut değerleme alanına aktarıldı. Ayrıntılı donanım incelemesine aşağıdan devam edebilirsiniz.'
                : 'Marka ve tam model adını ekleyip yeniden analiz edin. Örnek: iPhone 13 Pro Max 256GB 34.000 TL.'}</Text>
            </View>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: { width: '100%', maxWidth: 680, alignSelf: 'center', minWidth: 0, gap: 16 },
  inputCard: { padding: 20, borderRadius: 22, backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder, gap: 16, minWidth: 0 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  grow: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.cyan, fontSize: 10, lineHeight: 16, letterSpacing: 1, fontWeight: '800' },
  heading: { color: colors.textPrimary, fontSize: 21, lineHeight: 28, fontWeight: '800', flexShrink: 1 },
  resultHeading: { color: colors.textPrimary, fontSize: 18, lineHeight: 25, fontWeight: '700' },
  body: { color: colors.textSecondary, fontSize: 13, lineHeight: 22, flexShrink: 1 },
  caption: { color: colors.textSecondary, fontSize: 12, lineHeight: 19 },
  inputRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-end', minWidth: 0 },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  input: { flex: 1, width: '100%', minWidth: 0, minHeight: 126, maxHeight: 210, padding: 14, borderRadius: 13, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.inset, color: colors.textPrimary, fontSize: 16, lineHeight: 24 },
  analyzeButton: { maxWidth: '100%', minHeight: 52, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accent },
  fullButton: { width: '100%' },
  buttonText: { color: colors.onAccent, fontSize: 13, lineHeight: 20, fontWeight: '700', flexShrink: 1 },
  errorBox: { borderRadius: 12, padding: 12, backgroundColor: colors.dangerBg },
  errorText: { color: colors.dangerText, fontSize: 13, lineHeight: 21 },
  disabled: { opacity: 0.5 },
  pressed: { backgroundColor: colors.accentPressed },
});
