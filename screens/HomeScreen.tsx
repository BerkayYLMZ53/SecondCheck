import { useTheme, useThemedStyles } from '../context/ThemeContext';
import type { ThemeColors } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentRef, ReactNode } from 'react';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  ArrowRight,
  Check,
  Radar,
  Search,
  ShieldCheck,
  FileText,
  Stethoscope,
  Bookmark,
  BookmarkPlus,
  X,
} from 'lucide-react-native';
import { PRODUCTS_DATABASE, getProductById } from '../data/mockProducts';
import ChronicIssuesSection from '../components/ChronicIssuesSection';
import PriceTrendSection from '../components/PriceTrendSection';
import InspectionChecklist from '../components/InspectionChecklist';
import ExpertiseReportModal from '../components/ExpertiseReportModal';
import HardwareDiagnosticsModal from '../components/HardwareDiagnosticsModal';
import ListingInputSection from '../components/ListingInputSection';
import SavedListingsModal from '../components/SavedListingsModal';
import SecurityGuideModal from '../components/SecurityGuideModal';
import { useSavedListings } from '../context/SavedListingsContext';
import type { SavedItem } from '../types/savedListing';
import {
  CONDITION_FACTORS,
  savedValuationCondition,
} from '../utils/savedListings';
import type { ParsedListing } from '../utils/listingParser';
import AlternativesSection from '../components/AlternativesSection';
import type { Category, PriceAssessment, Product } from '../types/product';
import { evaluatePrice } from '../utils/evaluator';
import { buildExpertiseReport } from '../utils/expertiseReport';
import type { ExpertiseReport } from '../utils/expertiseReport';

const CATEGORIES: { id: Category | 'all'; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'gpu', label: 'Ekran Kartları' },
  { id: 'cpu', label: 'İşlemciler' },
  { id: 'ram', label: 'RAM / Bellekler' },
  { id: 'motherboard', label: 'Anakartlar' },
  { id: 'monitor', label: 'Monitörler' },
  { id: 'console', label: 'Konsollar' },
  { id: 'phone', label: 'Telefonlar' },
  { id: 'laptop', label: 'Laptoplar' },
  { id: 'handheld', label: 'El Konsolları' },
];
const CONDITIONS = [
  {
    id: 'boxed',
    label: 'Kutulu / Faturalı',
    factor: CONDITION_FACTORS.boxed,
    note: '%0',
  },
  {
    id: 'device',
    label: 'Sadece Cihaz',
    factor: CONDITION_FACTORS.device,
    note: '−%5',
  },
  {
    id: 'cosmetic',
    label: 'Kozmetik Kusurlu',
    factor: CONDITION_FACTORS.cosmetic,
    note: '−%12',
  },
] as const;
type Condition = (typeof CONDITIONS)[number];
interface Valuation {
  assessment: PriceAssessment;
  askingPrice: number;
  min: number;
  fair: number;
  max: number;
}
function buildValuation(
  product: Product,
  askingPrice: number,
  condition: Condition,
): Valuation {
  const adjusted = (value: number): number =>
    Math.round(value * condition.factor * 100) / 100;
  const min = adjusted(product.marketPriceMin);
  const fair = adjusted(product.fairPrice);
  const max = adjusted(product.marketPriceMax);
  return {
    askingPrice,
    min,
    fair,
    max,
    assessment: evaluatePrice(askingPrice, fair, min, max),
  };
}
function useHomeStyles() {
  const { colors: COLORS } = useTheme();
  const styles = useThemedStyles(createStyles);
  const VERDICTS: Record<
    PriceAssessment['status'],
    { label: string; color: string }
  > = {
    bargain: { label: 'Fırsat Fiyatı', color: COLORS.green },
    fair: { label: 'Piyasa Değerinde', color: COLORS.blue },
    overpriced: { label: 'Pahalı / Pazarlık Yapılmalı', color: COLORS.red },
  };
  return { COLORS, styles, VERDICTS };
}
const money = (value: number): string =>
  `${value.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL`;
const searchKey = (value: string): string =>
  value
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
const PAGE_SIZE = 20;
// Normalize once, rather than rebuilding searchable strings on every keystroke.
const SEARCH_INDEX = PRODUCTS_DATABASE.map((product) => ({
  product,
  text: searchKey(`${product.name} ${product.brand}`),
}));
const CATEGORY_COUNT = new Set(
  PRODUCTS_DATABASE.map((product) => product.category),
).size;

interface ProductCardProps {
  product: Product;
  active: boolean;
  onSelect: (product: Product) => void;
  cardWidth: number;
}

// Price entry and checklist interactions should not rebuild the carousel cards.
const ProductCard = memo(function ProductCard({
  product,
  active,
  onSelect,
  cardWidth,
}: ProductCardProps) {
  const { COLORS, styles } = useHomeStyles();

  return (
    <Pressable
      testID="product-card"
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${money(product.marketPriceMin)} ile ${money(product.marketPriceMax)}, ${product.chronicIssues.length} kronik sorun`}
      accessibilityState={{ selected: active }}
      aria-selected={active}
      onPress={() => onSelect(product)}
      style={({ pressed }) => [
        styles.productCard,
        { width: cardWidth },
        active && styles.selectedCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.cardTop}>
        <Text style={styles.brand}>
          {product.brand.toLocaleUpperCase('tr-TR')}
        </Text>
        <Text style={styles.year}>{product.releaseYear}</Text>
      </View>
      <Text style={styles.productName}>{product.name}</Text>
      <Text style={styles.caption}>Piyasa aralığı</Text>
      <Text style={styles.marketPrice}>
        {product.marketPriceMin.toLocaleString('tr-TR')} -{' '}
        {money(product.marketPriceMax)}
      </Text>
      <View style={styles.cardTop}>
        <Text style={styles.issueCount}>
          {product.chronicIssues.length} Kronik Sorun
        </Text>
        {active && <Check size={18} color={COLORS.cyan} />}
      </View>
    </Pressable>
  );
});

function PriceGauge({ valuation }: { valuation: Valuation }) {
  const { COLORS, styles, VERDICTS } = useHomeStyles();

  const { askingPrice, min, fair, max, assessment } = valuation;
  // Extend the scale for outliers so the pointer never misrepresents a clamped price.
  const lowest = Math.min(min, askingPrice);
  const highest = Math.max(max, askingPrice);
  const padding = Math.max((highest - lowest) * 0.12, 1);
  const start = Math.max(0, lowest - padding);
  const end = highest + padding;
  const position = (value: number): `${number}%` =>
    `${((value - start) / (end - start)) * 100}%`;
  const color = VERDICTS[assessment.status].color;

  return (
    <View
      style={styles.gauge}
      accessible
      accessibilityLabel={`İlan ${money(askingPrice)}, minimum ${money(min)}, adil ${money(fair)}, maksimum ${money(max)}`}
    >
      <Text style={[styles.askingLabel, { color }]}>
        İlanınız · {money(askingPrice)}
      </Text>
      <View style={styles.track}>
        <View
          style={[
            styles.marketBand,
            {
              left: position(min),
              width: `${((max - min) / (end - start)) * 100}%`,
            },
          ]}
        />
        {[min, fair, max].map((value, index) => (
          <View
            key={index}
            style={[
              styles.tick,
              { left: position(value) },
              index === 1 && styles.fairTick,
            ]}
          />
        ))}
        <View
          style={[
            styles.pointer,
            {
              left: position(askingPrice),
              backgroundColor: color,
              shadowColor: color,
            },
          ]}
        />
      </View>
      <View style={styles.rangeLabels}>
        <View style={styles.rangeColumn}>
          <Text style={styles.caption}>Minimum</Text>
          <Text style={styles.rangeValue}>{money(min)}</Text>
        </View>
        <View style={styles.rangeColumn}>
          <Text style={[styles.caption, { color: COLORS.cyan }]}>
            Adil fiyat
          </Text>
          <Text style={styles.rangeValue}>{money(fair)}</Text>
        </View>
        <View style={styles.rangeColumn}>
          <Text style={styles.caption}>Maksimum</Text>
          <Text style={styles.rangeValue}>{money(max)}</Text>
        </View>
      </View>
    </View>
  );
}

interface HomeScreenProps {
  navigation?: ReactNode;
  onCompareProducts?: (a: Product, b: Product) => void;
  onCompareSavedListings?: (a: SavedItem, b: SavedItem) => void;
}
export default function HomeScreen({
  navigation,
  onCompareProducts,
  onCompareSavedListings,
}: HomeScreenProps) {
  const { COLORS, styles, VERDICTS } = useHomeStyles();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const availableWidth = Math.max(0, width - insets.left - insets.right);
  const compact = availableWidth < 375;
  const cardWidth = Math.min(
    300,
    Math.max(
      44,
      (Math.min(680, availableWidth) - (compact ? 32 : 40) - 32) * 0.92,
    ),
  );
  const { savedListings, saveListing, isReady, storageMessage } =
    useSavedListings();

  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const carouselRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);
  const [selectedId, setSelectedId] = useState<string | null>(
    PRODUCTS_DATABASE[0]?.id ?? null,
  );
  const [condition, setCondition] = useState<Condition>(CONDITIONS[0]);
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [valuation, setValuation] = useState<Valuation | null>(null);
  const [report, setReport] = useState<ExpertiseReport | null>(null);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [listingTitle, setListingTitle] = useState('');
  const [parserVersion, setParserVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [faultyLoaded, setFaultyLoaded] = useState(false);
  useEffect(() => {
    if (!saveFeedback) return;
    const timer = setTimeout(() => setSaveFeedback(null), 4500);
    return () => clearTimeout(timer);
  }, [saveFeedback]);
  const inspectionRef = useRef<{
    productId: string;
    checkedIds: ReadonlySet<string>;
  } | null>(null);
  const receiveInspection = useCallback(
    (productId: string, checkedIds: ReadonlySet<string>) => {
      inspectionRef.current = { productId, checkedIds };
    },
    [],
  );

  const filteredProducts = useMemo(() => {
    // All words must match, allowing "Ryzen 5600" to match "AMD Ryzen 5 5600"
    // and "MacBook M1" to match "MacBook Air M1" without delaying input.
    const tokens = searchKey(query).split(/\s+/).filter(Boolean);
    return SEARCH_INDEX.filter(
      (entry) =>
        (category === 'all' || entry.product.category === category) &&
        tokens.every((token) => entry.text.includes(token)),
    ).map((entry) => entry.product);
  }, [query, category]);
  const selectedProduct =
    filteredProducts.find((product) => product.id === selectedId) ??
    filteredProducts[0];
  const visibleProducts = useMemo(() => {
    const page = filteredProducts.slice(0, displayLimit);
    // An alternative can be anywhere in the full catalog. Pin it into the small
    // visible page instead of mounting hundreds of cards to reveal its position.
    return selectedProduct &&
      !page.some((product) => product.id === selectedProduct.id)
      ? [selectedProduct, ...page.slice(0, Math.max(0, displayLimit - 1))]
      : page;
  }, [filteredProducts, displayLimit, selectedProduct]);

  const resetAnalysis = useCallback(() => {
    setValuation(null);
    setError(null);
  }, []);

  const selectProduct = useCallback(
    (product: Product) => {
      setSelectedId(product.id);
      setPrice('');
      setCondition(CONDITIONS[0]);
      setListingTitle('');
      setFaultyLoaded(false);
      setSaveFeedback(null);
      resetAnalysis();
    },
    [resetAnalysis],
  );

  function resetSelection() {
    setDisplayLimit(PAGE_SIZE);
    carouselRef.current?.scrollTo({ x: 0, animated: false });
    setSelectedId(null);
    setPrice('');
    setCondition(CONDITIONS[0]);
    setListingTitle('');
    setFaultyLoaded(false);
    setSaveFeedback(null);
    resetAnalysis();
  }

  function inspectAlternative(product: Product) {
    setDisplayLimit(PAGE_SIZE);
    setQuery('');
    setCategory('all');
    selectProduct(product);
    Keyboard.dismiss();
    carouselRef.current?.scrollTo({ x: 0, animated: false });
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function applyParsedListing(listing: ParsedListing, title: string) {
    if (!listing.product) return;
    const matchedCondition =
      CONDITIONS.find((item) => item.id === listing.condition) ?? CONDITIONS[0];
    setQuery('');
    setCategory(listing.product.category);
    setDisplayLimit(PAGE_SIZE);
    setSelectedId(listing.product.id);
    setListingTitle(title);
    setFaultyLoaded(false);
    setSaveFeedback(null);
    setCondition(matchedCondition);
    setPrice(
      listing.price?.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) ??
        '',
    );
    setError(null);
    setValuation(
      listing.price !== null
        ? buildValuation(listing.product, listing.price, matchedCondition)
        : null,
    );
    carouselRef.current?.scrollTo({ x: 0, animated: false });
    Keyboard.dismiss();
  }

  function analyze() {
    if (!selectedProduct) return;
    if (faultyLoaded) {
      setError(
        'Arızalı kayıt için önce cihazın durumunu doğrulayın veya bir kondisyon seçin.',
      );
      return;
    }
    const input = price
      .trim()
      .replace(/\s*TL$/i, '')
      .trim();
    // Turkish input: 13000, 13.000, or 13.000,50. Reject malformed grouping.
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(input)) {
      setError('Geçerli bir TL tutarı girin. Örnek: 13.000 veya 13.000,50.');
      setValuation(null);
      return;
    }
    const askingPrice = Number(input.replace(/\./g, '').replace(',', '.'));
    if (
      !Number.isFinite(askingPrice) ||
      askingPrice <= 0 ||
      askingPrice > Number.MAX_SAFE_INTEGER / 100
    ) {
      setError('Sıfırdan büyük, geçerli bir fiyat girin.');
      setValuation(null);
      return;
    }
    setValuation(buildValuation(selectedProduct, askingPrice, condition));
    setError(null);
    Keyboard.dismiss();
  }

  async function saveCurrentListing() {
    if (!selectedProduct || !valuation || !isReady || saving) return;
    setSaving(true);
    try {
      await saveListing({
        productId: selectedProduct.id,
        title: listingTitle.trim() || selectedProduct.name,
        askedPrice: valuation.askingPrice,
        condition: condition.id === 'cosmetic' ? 'minor_defects' : 'clean',
        valuationCondition: condition.id,
      });
      setSaveFeedback('İlan listene eklendi.');
      Keyboard.dismiss();
    } catch (saveError) {
      setSaveFeedback(
        saveError instanceof Error ? saveError.message : 'İlan kaydedilemedi.',
      );
    } finally {
      setSaving(false);
    }
  }

  function loadSavedListing(item: SavedItem) {
    const product = getProductById(item.productId);
    if (!product) {
      setSaveFeedback('Ürün artık katalogda bulunmuyor.');
      return;
    }
    const restored =
      CONDITIONS.find((entry) => entry.id === savedValuationCondition(item)) ??
      CONDITIONS[0];
    setQuery('');
    setCategory(product.category);
    setDisplayLimit(PAGE_SIZE);
    setSelectedId(product.id);
    setCondition(restored);
    setPrice(
      item.askedPrice.toLocaleString('tr-TR', { maximumFractionDigits: 2 }),
    );
    setListingTitle(item.title);
    setFaultyLoaded(item.condition === 'faulty');
    setValuation(
      item.condition === 'faulty'
        ? null
        : buildValuation(product, item.askedPrice, restored),
    );
    setError(null);
    setSaveFeedback('Kaydedilen ilan yüklendi.');
    setParserVersion((version) => version + 1);
    setSavedOpen(false);
    carouselRef.current?.scrollTo({ x: 0, animated: false });
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    Keyboard.dismiss();
  }

  function saveAction(testID: string) {
    return (
      <View style={styles.saveAction}>
        <Pressable
          testID={testID}
          accessibilityRole="button"
          disabled={!valuation || !isReady || saving}
          accessibilityState={{ disabled: !valuation || !isReady || saving }}
          onPress={() => void saveCurrentListing()}
          style={({ pressed }) => [
            styles.reportButton,
            (!valuation || !isReady || saving) && styles.disabledSave,
            pressed && styles.pressed,
          ]}
        >
          <BookmarkPlus size={20} color={COLORS.cyan} />
          <Text style={styles.actionText}>
            {saving ? 'Kaydediliyor…' : '📌 Bu İlanı Listeme Kaydet'}
          </Text>
        </Pressable>
        {saveFeedback && (
          <Text
            testID="save-listing-feedback"
            accessibilityLiveRegion="polite"
            style={styles.caption}
          >
            {saveFeedback}
          </Text>
        )}
        {!valuation && (
          <Text style={styles.caption}>
            Kaydetmek için önce ilan fiyatını analiz edin.
          </Text>
        )}
        {!isReady && (
          <Text style={styles.caption}>Kaydedilen ilanlar yükleniyor…</Text>
        )}
      </View>
    );
  }

  function openReport() {
    if (!selectedProduct) return;
    Keyboard.dismiss();
    const inspection = inspectionRef.current;
    setReport(
      buildExpertiseReport({
        product: selectedProduct,
        checkedIds:
          inspection?.productId === selectedProduct.id
            ? inspection.checkedIds
            : new Set<string>(),
        valuation,
        conditionLabel: condition.label,
      }),
    );
  }

  return (
    <SafeAreaView
      testID="home-safe-area"
      edges={['top', 'left', 'right']}
      style={styles.flex}
    >
      {navigation}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          testID="home-scroll"
          style={styles.scroll}
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'web' ? 'none' : 'on-drag'}
          contentContainerStyle={[styles.page, compact && styles.compactPage]}
        >
          <View style={styles.header}>
            <View
              style={[
                styles.headerTop,
                availableWidth < 600 && styles.headerStacked,
              ]}
            >
              <View style={styles.titleRow}>
                <View style={styles.logo}>
                  <Radar size={25} color={COLORS.cyan} />
                </View>
                <Text style={styles.title}>SecondCheck</Text>
                <View style={styles.beta}>
                  <Text style={styles.betaText}>BETA / Radar</Text>
                </View>
              </View>
              <View style={styles.headerActions}>
                <Pressable
                  testID="open-saved-listings"
                  accessibilityRole="button"
                  accessibilityLabel={`Kaydedilenler (${savedListings.length})`}
                  onPress={() => {
                    Keyboard.dismiss();
                    setSavedOpen(true);
                  }}
                  style={({ pressed }) => [
                    styles.basketButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Bookmark size={18} color={COLORS.cyan} />
                  <Text style={styles.actionText}>Kaydedilenler</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{savedListings.length}</Text>
                  </View>
                </Pressable>
                <ThemeToggle />
              </View>
            </View>
            <Text style={styles.subtitle}>
              İkinci El Fiyat & Kronik Sorun Radarı
            </Text>
            {storageMessage && (
              <Text accessibilityRole="alert" style={styles.error}>
                {storageMessage}
              </Text>
            )}
          </View>

          <ListingInputSection
            key={parserVersion}
            onParsed={applyParsedListing}
          />
          <Text accessibilityRole="header" style={styles.sectionTitle}>Manuel Ürün &amp; Donanım Değerleme</Text>
          {valuation && saveAction('save-parsed-listing')}
          <View style={styles.searchBox}>
            <Search size={20} color={COLORS.muted} />
            <TextInput
              style={styles.searchInput}
              value={query}
              placeholder="Ürün veya marka ara…"
              placeholderTextColor={COLORS.muted}
              accessibilityLabel="Ürün veya marka ara"
              autoCorrect={false}
              returnKeyType="search"
              onChangeText={(text) => {
                setQuery(text);
                resetSelection();
              }}
            />
            {query.length > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Aramayı temizle"
                hitSlop={8}
                style={styles.clearButton}
                onPress={() => {
                  setQuery('');
                  resetSelection();
                }}
              >
                <X size={19} color={COLORS.muted} />
              </Pressable>
            )}
          </View>

          <ScrollView
            testID="category-list"
            style={styles.horizontalList}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            keyboardShouldPersistTaps="handled"
          >
            {CATEGORIES.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ selected: category === item.id }}
                onPress={() => {
                  setCategory(item.id);
                  resetSelection();
                }}
                style={({ pressed }) => [
                  styles.chip,
                  category === item.id && styles.activeChip,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    category === item.id && styles.activeText,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Radardaki ürünler</Text>
            <Text accessibilityLiveRegion="polite" style={styles.caption}>
              {filteredProducts.length} ürün
            </Text>
          </View>
          {filteredProducts.length === 0 ? (
            <View style={styles.empty}>
              <Search size={28} color={COLORS.cyan} />
              <Text style={styles.sectionTitle}>Ürün bulunamadı</Text>
              <Text style={styles.body}>
                Başka bir ürün veya marka arayın, ya da filtreleri sıfırlayın.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setQuery('');
                  setCategory('all');
                  resetSelection();
                }}
                style={[styles.chip, styles.activeChip]}
              >
                <Text style={styles.activeText}>Filtreleri sıfırla</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView
              ref={carouselRef}
              testID="product-carousel"
              style={styles.horizontalList}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carousel}
              keyboardShouldPersistTaps="handled"
            >
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  active={selectedProduct?.id === product.id}
                  onSelect={selectProduct}
                  cardWidth={cardWidth}
                />
              ))}
            </ScrollView>
          )}
          {filteredProducts.length > 0 && (
            <View style={styles.resultsFooter}>
              <Text style={styles.caption}>
                {visibleProducts.length} / {filteredProducts.length} ürün
                gösteriliyor
              </Text>
              {visibleProducts.length < filteredProducts.length && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Daha Fazla Göster (+20)"
                  onPress={() =>
                    setDisplayLimit((limit) =>
                      Math.min(limit + PAGE_SIZE, filteredProducts.length),
                    )
                  }
                  style={({ pressed }) => [
                    styles.loadMore,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.actionText}>Daha Fazla Göster (+20)</Text>
                </Pressable>
              )}
            </View>
          )}

          {selectedProduct && (
            <>
              <View style={styles.panel}>
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionTitle}>İlan Kontrolü</Text>
                  <ShieldCheck size={21} color={COLORS.cyan} />
                </View>
                <Text style={styles.body}>{selectedProduct.name}</Text>
                <Text style={styles.inputLabel}>İlandaki Fiyat (TL)</Text>
                <View
                  style={[
                    styles.priceBox,
                    error !== null && styles.errorBorder,
                  ]}
                >
                  <TextInput
                    style={styles.priceInput}
                    value={price}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    placeholder={selectedProduct.fairPrice.toLocaleString(
                      'tr-TR',
                    )}
                    placeholderTextColor={COLORS.muted}
                    accessibilityLabel="İlandaki Fiyat (TL)"
                    maxLength={24}
                    onChangeText={(text) => {
                      setPrice(text);
                      resetAnalysis();
                    }}
                    onSubmitEditing={analyze}
                  />
                  <View style={styles.currencyBadge}>
                    <Text style={styles.currency}>TL</Text>
                  </View>
                </View>
                {error && (
                  <Text accessibilityRole="alert" style={styles.error}>
                    {error}
                  </Text>
                )}
                <Text style={styles.inputLabel}>Cihazın durumu</Text>
                {faultyLoaded && (
                  <Text style={styles.error}>
                    Arızalı bir ilan yüklendi. Otomatik değerleme için önce
                    gerçek kondisyonu doğrulayın; onarım masrafı ayrıca
                    değerlendirilmelidir.
                  </Text>
                )}
                <View style={styles.conditions}>
                  {CONDITIONS.map((item) => (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: condition.id === item.id,
                      }}
                      aria-pressed={condition.id === item.id}
                      onPress={() => {
                        setCondition(item);
                        setFaultyLoaded(false);
                        resetAnalysis();
                      }}
                      style={({ pressed }) => [
                        styles.condition,
                        condition.id === item.id && styles.selectedCondition,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          condition.id === item.id && styles.actionText,
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text style={styles.caption}>{item.note}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.caption}>
                  Duruma göre adil fiyat:{' '}
                  {money(
                    Math.round(selectedProduct.fairPrice * condition.factor),
                  )}
                </Text>
                <Text style={styles.inputLabel}>
                  İlan başlığı / notun (isteğe bağlı)
                </Text>
                <TextInput
                  testID="listing-note-input"
                  accessibilityLabel="İlan başlığı veya notun"
                  placeholder={selectedProduct.name}
                  placeholderTextColor={COLORS.muted}
                  value={listingTitle}
                  maxLength={300}
                  onChangeText={setListingTitle}
                  style={styles.listingNote}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Analiz Et & Değerlendir"
                  disabled={faultyLoaded}
                  accessibilityState={{ disabled: faultyLoaded }}
                  onPress={analyze}
                  style={({ pressed }) => [
                    styles.analyzeButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.buttonText}>Analiz Et & Değerlendir</Text>
                  <ArrowRight size={20} color={COLORS.onAccent} />
                </Pressable>
              </View>

              {valuation && (
                <View
                  style={[
                    styles.panel,
                    {
                      borderColor: VERDICTS[valuation.assessment.status].color,
                    },
                  ]}
                  accessibilityLiveRegion="polite"
                >
                  <Text style={styles.eyebrow}>DEĞERLENDİRME SONUCU</Text>
                  <View
                    style={[
                      styles.verdictBadge,
                      {
                        backgroundColor: `${VERDICTS[valuation.assessment.status].color}20`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.verdictTitle,
                        { color: VERDICTS[valuation.assessment.status].color },
                      ]}
                    >
                      {VERDICTS[valuation.assessment.status].label}
                    </Text>
                  </View>
                  <Text style={styles.body}>
                    Adil değere göre{' '}
                    {valuation.assessment.deltaPercentage > 0 ? '+' : ''}
                    {valuation.assessment.deltaPercentage.toLocaleString(
                      'tr-TR',
                      { maximumFractionDigits: 1 },
                    )}
                    %
                  </Text>
                  <PriceGauge valuation={valuation} />
                  <Text style={styles.advice}>
                    {valuation.assessment.adviceText}
                  </Text>
                  <Text style={styles.caption}>
                    Aralık ve adil fiyat, seçilen cihaz durumuna göre
                    uyarlanmıştır.
                  </Text>
                </View>
              )}

              {saveAction('save-evaluated-listing')}

              <PriceTrendSection
                key={`trend-${selectedProduct.id}`}
                product={selectedProduct}
              />
              <ChronicIssuesSection
                key={`issues-${selectedProduct.id}`}
                product={selectedProduct}
              />
              <Pressable
                testID="open-security-guide"
                accessibilityRole="button"
                accessibilityLabel="Param Güvende / Kargo ile mi Alıyorsun? (Güvenlik Uyarısı)"
                onPress={() => {
                  Keyboard.dismiss();
                  setSecurityOpen(true);
                }}
                style={({ pressed }) => [
                  styles.securityButton,
                  pressed && styles.pressed,
                ]}
              >
                <ShieldCheck size={23} color="#F59E0B" />
                <Text style={styles.securityButtonText}>
                  🛡️ Param Güvende / Kargo ile mi Alıyorsun? (Güvenlik Uyarısı)
                </Text>
              </Pressable>
              <InspectionChecklist
                key={`checklist-${selectedProduct.id}`}
                product={selectedProduct}
                onProgressChange={receiveInspection}
              />
              <Pressable
                testID="open-hardware-diagnostics"
                accessibilityRole="button"
                onPress={() => {
                  Keyboard.dismiss();
                  setDiagnosticsOpen(true);
                }}
                style={({ pressed }) => [
                  styles.reportButton,
                  pressed && styles.pressed,
                ]}
              >
                <Stethoscope size={20} color={COLORS.cyan} />
                <Text style={styles.actionText}>Donanımı Yerinde Test Et</Text>
              </Pressable>
              <Pressable
                testID="open-expertise-report"
                accessibilityRole="button"
                accessibilityLabel="Raporu Paylaş / Özeti Çıkar"
                onPress={openReport}
                style={({ pressed }) => [
                  styles.reportButton,
                  pressed && styles.pressed,
                ]}
              >
                <FileText size={20} color={COLORS.cyan} />
                <Text style={styles.actionText}>
                  Raporu Paylaş / Özeti Çıkar
                </Text>
              </Pressable>
              <AlternativesSection
                product={selectedProduct}
                onSelectProduct={inspectAlternative}
                onCompareProducts={onCompareProducts}
              />
            </>
          )}
          <Text style={styles.footer}>
            {PRODUCTS_DATABASE.length} ürün · {CATEGORY_COUNT} kategori · Daha
            bilinçli ikinci el alışverişi{'\n'}Fiyatlar örnek veri setidir;
            güncel piyasa teklifleri değildir.
          </Text>
          <View style={styles.panel}>
            <Text style={styles.body}>
              Veriler topluluk bildirimleri ve pazar ortalamaları baz alınarak
              üretilmiştir. Kesin ekspertiz yerine geçmez.
            </Text>
          </View>
        </ScrollView>
        {report && (
          <ExpertiseReportModal
            report={report}
            onClose={() => setReport(null)}
          />
        )}
        {diagnosticsOpen && (
          <HardwareDiagnosticsModal onClose={() => setDiagnosticsOpen(false)} />
        )}
        <SecurityGuideModal
          key={`security-${selectedProduct?.id ?? 'none'}-${price}-${listingTitle}`}
          visible={securityOpen}
          onClose={() => setSecurityOpen(false)}
        />
        {savedOpen && (
          <SavedListingsModal
            onClose={() => setSavedOpen(false)}
            onLoad={loadSavedListing}
            onCompare={
              onCompareSavedListings
                ? (a, b) => {
                    setSavedOpen(false);
                    onCompareSavedListings(a, b);
                  }
                : undefined
            }
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (COLORS: ThemeColors) =>
  StyleSheet.create({
    securityButton: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#F59E0B',
      backgroundColor: '#F59E0B14',
    },
    securityButtonText: {
      flex: 1,
      minWidth: 0,
      color: COLORS.amber,
      fontSize: 14,
      fontWeight: '700',
      lineHeight: 21,
    },
    saveAction: { gap: 8 },
    disabledSave: { opacity: 0.45 },
    listingNote: {
      minHeight: 48,
      fontSize: 16,
      color: COLORS.text,
      backgroundColor: COLORS.inset,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 12,
      padding: 12,
    },
    headerActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      alignItems: 'center',
      maxWidth: '100%',
    },
    basketButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 44,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: COLORS.accentSoft,
      borderWidth: 1,
      borderColor: COLORS.cardBorder,
    },
    countBadge: {
      minWidth: 24,
      height: 24,
      paddingHorizontal: 6,
      borderRadius: 12,
      backgroundColor: COLORS.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countText: { color: COLORS.onAccent, fontSize: 12, fontWeight: '700' },
    reportButton: {
      minHeight: 52,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.cardBorder,
      backgroundColor: COLORS.accentSoft,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      flexWrap: 'wrap',
    },
    flex: { flex: 1, minWidth: 0, backgroundColor: COLORS.background },
    scroll: { flex: 1, minHeight: 0 },
    compactPage: { paddingHorizontal: 16 },
    headerStacked: { flexDirection: 'column', alignItems: 'stretch' },
    page: {
      flexGrow: 1,
      padding: 20,
      paddingBottom: 60,
      gap: 20,
      width: '100%',
      maxWidth: 680,
      alignSelf: 'center',
    },
    header: { gap: 10, paddingTop: 8 },
    headerTop: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      gap: 12,
    },
    titleRow: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 'auto',
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 10,
    },
    logo: { padding: 8, backgroundColor: COLORS.accentSoft, borderRadius: 13 },
    title: {
      flexShrink: 1,
      color: COLORS.text,
      fontSize: 27,
      fontWeight: '800',
      letterSpacing: -1,
    },
    beta: {
      backgroundColor: COLORS.accentSoft,
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 6,
    },
    betaText: {
      color: COLORS.cyan,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.6,
    },
    subtitle: { color: COLORS.muted, fontSize: 14, lineHeight: 21 },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 14,
      paddingLeft: 16,
      paddingRight: 6,
    },
    searchInput: {
      flex: 1,
      minWidth: 0,
      minHeight: 54,
      color: COLORS.text,
      fontSize: 16,
    },
    clearButton: {
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    horizontalList: { flexGrow: 0, flexShrink: 0, minWidth: 0, width: '100%' },
    chips: { gap: 8, paddingHorizontal: 16 },
    chip: {
      minWidth: 44,
      backgroundColor: COLORS.surface,
      borderRadius: 24,
      paddingHorizontal: 17,
      minHeight: 44,
      justifyContent: 'center',
    },
    activeChip: { backgroundColor: COLORS.blue },
    chipText: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
    actionText: {
      color: COLORS.cyan,
      fontWeight: '700',
      flexShrink: 1,
      flexWrap: 'wrap',
      textAlign: 'center',
    },
    activeText: { color: COLORS.onAccent, fontWeight: '700' },
    pressed: { opacity: 0.75 },
    sectionHeading: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
    caption: { color: COLORS.muted, fontSize: 12, lineHeight: 19 },
    carousel: { gap: 12, paddingVertical: 8, paddingHorizontal: 16 },
    resultsFooter: { alignItems: 'center', gap: 12 },
    loadMore: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: COLORS.accentSoft,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    productCard: {
      maxWidth: '100%',
      flexShrink: 0,
      padding: 18,
      gap: 10,
      borderRadius: 14,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    selectedCard: {
      borderColor: COLORS.cyan,
      backgroundColor: COLORS.accentSelected,
      shadowColor: COLORS.cyan,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.23,
      shadowRadius: 7,
      elevation: 4,
    },
    cardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    brand: {
      color: COLORS.cyan,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
      flexShrink: 1,
    },
    year: {
      color: COLORS.muted,
      fontSize: 11,
      backgroundColor: COLORS.badgeBg,
      paddingVertical: 4,
      paddingHorizontal: 7,
      borderRadius: 5,
    },
    productName: {
      color: COLORS.text,
      fontSize: 16,
      lineHeight: 23,
      fontWeight: '700',
      minHeight: 69,
    },
    marketPrice: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
    issueCount: { color: COLORS.amber, fontSize: 12, fontWeight: '600' },
    empty: {
      alignItems: 'center',
      gap: 14,
      padding: 24,
      borderRadius: 18,
      backgroundColor: COLORS.surface,
    },
    panel: {
      minWidth: 0,
      backgroundColor: COLORS.surface,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.cardBorder,
      gap: 14,
    },
    body: {
      color: COLORS.muted,
      fontSize: 13,
      lineHeight: 21,
      flexShrink: 1,
      flexWrap: 'wrap',
    },
    inputLabel: {
      color: COLORS.text,
      fontSize: 13,
      fontWeight: '600',
      marginTop: 6,
    },
    priceBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.background,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 8,
      gap: 10,
      minWidth: 0,
    },
    currencyBadge: {
      flexShrink: 0,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 7,
      backgroundColor: COLORS.accentSoft,
    },
    currency: { color: COLORS.cyan, fontSize: 13, fontWeight: '700' },
    priceInput: {
      color: COLORS.text,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '600',
      minHeight: 44,
      paddingVertical: 8,
      paddingHorizontal: 2,
      flex: 1,
      minWidth: 0,
    },
    errorBorder: { borderColor: COLORS.red },
    error: { color: COLORS.dangerText, fontSize: 13, lineHeight: 20 },
    conditions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    condition: {
      padding: 12,
      minHeight: 62,
      maxWidth: '100%',
      gap: 5,
      backgroundColor: COLORS.background,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 10,
      flexGrow: 1,
      alignItems: 'center',
    },
    selectedCondition: {
      borderColor: COLORS.blue,
      backgroundColor: COLORS.accentSoft,
    },
    analyzeButton: {
      backgroundColor: COLORS.blue,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
      minHeight: 54,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      marginTop: 4,
    },
    buttonPressed: {
      backgroundColor: COLORS.blue,
      transform: [{ scale: 0.98 }],
    },
    buttonText: {
      color: COLORS.onAccent,
      fontSize: 15,
      fontWeight: '700',
      flexShrink: 1,
    },
    eyebrow: {
      color: COLORS.muted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.5,
    },
    verdictBadge: {
      alignSelf: 'flex-start',
      maxWidth: '100%',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 9,
    },
    verdictTitle: {
      fontSize: 18,
      fontWeight: '800',
      flexShrink: 1,
      flexWrap: 'wrap',
    },
    gauge: { gap: 20, paddingVertical: 8 },
    askingLabel: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
    track: {
      height: 10,
      borderRadius: 5,
      backgroundColor: COLORS.track,
      marginHorizontal: 8,
    },
    marketBand: {
      position: 'absolute',
      height: 10,
      borderRadius: 5,
      backgroundColor: COLORS.blue,
    },
    tick: {
      position: 'absolute',
      top: -5,
      height: 20,
      width: 2,
      backgroundColor: COLORS.muted,
      marginLeft: -1,
    },
    fairTick: { backgroundColor: COLORS.cyan, height: 26, top: -8 },
    pointer: {
      position: 'absolute',
      width: 18,
      height: 18,
      top: -4,
      marginLeft: -9,
      borderRadius: 9,
      borderWidth: 3,
      borderColor: COLORS.text,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 8,
      elevation: 5,
    },
    rangeLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 6,
    },
    rangeColumn: { flex: 1, minWidth: 0, alignItems: 'center', gap: 4 },
    rangeValue: {
      color: COLORS.text,
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
    },
    advice: { color: COLORS.text, fontSize: 14, lineHeight: 23 },
    footer: {
      color: COLORS.muted,
      fontSize: 11,
      lineHeight: 19,
      textAlign: 'center',
    },
  });
