import Pressable from './AnimatedPressable';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { ClipboardPaste, SearchCheck } from 'lucide-react-native';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import type { ThemeColors } from '../context/ThemeContext';
import { parseListingInput } from '../utils/listingInput';
import type { ListingInputResult } from '../utils/listingInput';
import type { ParsedListing } from '../utils/listingParser';
import ListingSkeleton from './ListingSkeleton';
import { useAnalysisPresentation } from '../context/AnalysisPresentationContext';
import { catalogDeviceName } from '../utils/listingAnalysisReport';
import { isLinkInput, MODEL_NOT_FOUND } from '../utils/linkParser';
import { getMarketplacePlatform, MARKETPLACE_MODEL_NOT_FOUND } from '../utils/marketplaceParser';
import { triggerSuccess } from '../utils/haptics';

interface Props {
  onParsed?: (listing: ParsedListing, title: string) => void;
  /** Full HTTPS address for native; same-origin /api/parse-listing on web. */
  apiEndpoint?: string;
  active?: boolean;
  value?: string;
  onInputChange?: (value: string) => void;
}

export default function ListingInputSection({ onParsed, apiEndpoint, active = true, value, onInputChange }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const presentation = useAnalysisPresentation();
  const { width } = useWindowDimensions();
  const [localText, setLocalText] = useState('');
  const text = value ?? localText;
  const setText = onInputChange ?? setLocalText;
  const [storedAnalysis, setAnalysis] = useState<(ListingInputResult & { input: string }) | null>(null);
  const analysis = storedAnalysis?.input === text ? storedAnalysis : null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const lastAutoInput = useRef<string | null>(null);
  // Parent callbacks can change while an analysis is pending. Keep the latest
  // handler without restarting the automatic URL effect on every parent render.
  const onParsedRef = useRef(onParsed);
  useEffect(() => { onParsedRef.current = onParsed; }, [onParsed]);
  useEffect(() => () => { requestId.current++; controller.current?.abort(); }, []);
  const disabled = !text.trim() || loading;

  const analyze = useCallback(async (input: string) => {
    if (!input.trim()) return;
    lastAutoInput.current = input;
    const id = ++requestId.current;
    controller.current?.abort();
    const activeController = new AbortController();
    controller.current = activeController;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    presentation.begin();
    Keyboard.dismiss();
    try {
      const result = await parseListingInput(input, apiEndpoint ?? process.env.EXPO_PUBLIC_LISTING_API_URL, activeController.signal);
      if (id !== requestId.current || activeController.signal.aborted) return;
      setAnalysis({ ...result, input });
      if ((result.listing.matchedDevice || result.listing.product) && (!result.marketplace || result.marketplace.canOpenValuation)) void triggerSuccess();
      if (result.marketplace && !result.marketplace.canOpenValuation) presentation.fail(MARKETPLACE_MODEL_NOT_FOUND);
      else if (result.listing.matchedDevice) presentation.complete(result.listing, result.title, catalogDeviceName(result.listing), { open: !result.marketplace });
      else if (result.listing.product) presentation.complete(result.listing, result.title, result.listing.product.name);
      else presentation.fail(MODEL_NOT_FOUND);
      if (result.listing.product && (!result.marketplace || result.marketplace.canOpenValuation)) onParsedRef.current?.(result.listing, result.title);
    } catch (error) {
      if (id !== requestId.current || activeController.signal.aborted) return;
      setError(error instanceof Error ? error.message : 'İlan okunamadı. Başlığı ve açıklamayı yapıştırarak tekrar deneyin.');
      presentation.fail();
    } finally {
      if (id === requestId.current) { setLoading(false); controller.current = null; }
    }
  }, [apiEndpoint, presentation]);

  useEffect(() => {
    if (!active || !isLinkInput(text) || lastAutoInput.current === text) return;
    const timer = setTimeout(() => {
      if (lastAutoInput.current !== text) void analyze(text);
    }, getMarketplacePlatform(text) ? 0 : 450);
    return () => clearTimeout(timer);
  }, [active, analyze, text]);

  useEffect(() => {
    if (!active && controller.current) {
      requestId.current++;
      lastAutoInput.current = null;
      controller.current.abort();
      controller.current = null;
      setLoading(false);
      presentation.reset();
    }
  }, [active, presentation]);

  const listing = analysis?.listing;
  const marketplace = analysis?.marketplace;
  const marketplaceInput = getMarketplacePlatform(text) !== null;
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
            placeholder="Sahibinden, Trendyol, Hepsiburada, Easycep bağlantısı veya ilan metni…" placeholderTextColor={colors.textSecondary}
            multiline maxLength={12000} textAlignVertical="top" value={text}
            autoCapitalize="none" autoCorrect={false}
            onChangeText={(value) => {
              requestId.current++;
              lastAutoInput.current = null;
              controller.current?.abort();
              controller.current = null;
              setText(value); setAnalysis(null); setError(null); setLoading(false);
              presentation.reset();
            }}
            style={styles.input} />
          <Pressable haptic="medium" testID="parse-listing" accessibilityRole="button" accessibilityLabel="İlanı analiz et ve doğrula"
            accessibilityState={{ disabled, busy: loading }} disabled={disabled} onPress={() => { void analyze(text); }}
            style={({ pressed }) => [styles.analyzeButton, width < 560 && styles.fullButton, disabled && styles.disabled, pressed && styles.pressed]}>
            <SearchCheck size={20} color={colors.onAccent} />
            <Text style={styles.buttonText}>{loading ? (isLinkInput(text) ? 'Link Analiz Ediliyor...' : 'Analiz ediliyor…') : 'Analiz Et / Doğrula'}</Text>
          </Pressable>
        </View>
        <Text style={styles.caption}>{marketplaceInput ? 'Sahibinden ve Dolap bağlantıları cihazınızda, internet isteği yapılmadan çözümlenir.' : 'İlan metni cihazınızda analiz edilir. Linkler için yalnızca ilan sayfasındaki bilgiler alınır.'}</Text>
        {loading && <Text accessibilityLiveRegion="polite" style={styles.caption}>İlan bilgileri hazırlanıyor…</Text>}
        {analysis && listing?.matchedDevice && (!marketplace || marketplace.canOpenValuation) && <View testID="link-detection-badge" style={[styles.successBox, marketplace && styles.marketplaceSuccess]} accessibilityLiveRegion="polite">
          <SearchCheck size={18} color={marketplace ? colors.successText : colors.cyan} />
          <Text style={[styles.successText, marketplace && styles.marketplaceSuccessText]}>{marketplace
            ? `${marketplace.platform} İlanı Algılandı: ${listing.matchedDevice.model}${listing.detectedStorage ? ` (${listing.detectedStorage.replace(/(GB|TB)/, ' $1')})` : ''}`
            : `${listing.matchedDevice.model}${listing.detectedStorage ? ` ${listing.detectedStorage.replace(/(GB|TB)/, ' $1')}` : ''} tespit edildi`}</Text>
        </View>}
        {marketplace && !marketplace.canOpenValuation && <Text testID="marketplace-warning" accessibilityRole="alert" style={styles.errorText}>{MARKETPLACE_MODEL_NOT_FOUND}</Text>}
        {marketplaceInput && <Pressable testID="open-marketplace-expertise" accessibilityRole="button" accessibilityLabel="Ekspertiz ve piyasa değerlemesini aç"
          disabled={!marketplace?.canOpenValuation || loading} accessibilityState={{ disabled: !marketplace?.canOpenValuation || loading }}
          onPress={presentation.reopen} style={[styles.analyzeButton, marketplace?.canOpenValuation && styles.marketplaceReady, (!marketplace?.canOpenValuation || loading) && styles.disabled]}>
          <SearchCheck size={20} color={colors.onAccent} /><Text style={styles.buttonText}>Ekspertiz &amp; Piyasa Değerlemesine Geç</Text>
        </Pressable>}
        {analysis && listing?.matchedDevice && !listing.product && <Text style={styles.caption}>Model tanındı; kapasite veya değerleme kaydı bulunamadı. Lütfen manuel seçimle doğrulayın.</Text>}
        {error && <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.errorText}>{marketplaceInput ? MARKETPLACE_MODEL_NOT_FOUND : isLinkInput(text) ? `${MODEL_NOT_FOUND}. ${error}` : error}</Text></View>}
      </View>

      {loading && <ListingSkeleton active={active} />}
      {analysis && listing && !marketplace && (
        listing.matchedDevice
          ? <View style={styles.inputCard} testID="listing-result-preview">
              <Text style={styles.resultHeading}>{catalogDeviceName(listing)}</Text>
              <Text style={styles.body}>Analiziniz hazır. Kontrollerinize, saha testlerine ve raporlarınıza alt çekmeceden devam edin.</Text>
              <Pressable testID="open-analysis-details" accessibilityRole="button" accessibilityLabel="İlan ekspertiz detaylarını aç" onPress={presentation.reopen} style={styles.analyzeButton}>
                <SearchCheck size={20} color={colors.onAccent} /><Text style={styles.buttonText}>Ekspertiz detaylarını aç</Text>
              </Pressable>
            </View>
          : <View style={styles.inputCard} testID="listing-unmatched-result" accessibilityLiveRegion="polite">
              <Text style={styles.resultHeading}>{listing.product ? listing.product.name : MODEL_NOT_FOUND}</Text>
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
  successBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.accentSoft },
  successText: { flex: 1, color: colors.textPrimary, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  marketplaceSuccess: { backgroundColor: colors.successBg, borderWidth: 1, borderColor: colors.green },
  marketplaceSuccessText: { color: colors.successText },
  marketplaceReady: { backgroundColor: '#047857' },
  errorText: { color: colors.dangerText, fontSize: 13, lineHeight: 21 },
  disabled: { opacity: 0.5 },
  pressed: { backgroundColor: colors.accentPressed },
});
