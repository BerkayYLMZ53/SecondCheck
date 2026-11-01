import { useThemedStyles } from '../context/ThemeContext';
import type { ThemeColors } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { ArrowLeftRight, ChevronDown, ShieldCheck } from 'lucide-react-native';
import ProductPickerModal from '../components/ProductPickerModal';
import SavedListingSummary, {
  savedMoney,
} from '../components/SavedListingSummary';
import type { SavedComparisonPair } from '../types/savedListing';
import { useDetailStyles } from '../components/detailStyles';
import type { Product, Severity } from '../types/product';
import {
  calculateHardwareRisk,
  compareProducts,
  inspectionRequirements,
} from '../utils/comparison';
import type {
  ComparisonPair,
  ComparisonSlot,
  HardwareRisk,
} from '../utils/comparison';

interface Props {
  navigation?: ReactNode;
  products: ComparisonPair;
  onChange: (products: ComparisonPair) => void;
  listings?: SavedComparisonPair | null;
  onSwap?: () => void;
}

const money = (value: number): string => `${value.toLocaleString('tr-TR')} TL`;
const riskColor = (risk: HardwareRisk, colors: ThemeColors): string =>
  risk.score >= 7
    ? colors.dangerText
    : risk.score >= 4
      ? colors.amber
      : colors.successText;

function PairColumns({
  stacked,
  left,
  right,
}: {
  stacked: boolean;
  left: ReactNode;
  right: ReactNode;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.columns, stacked && styles.stacked]}>
      <View
        testID="comparison-column-a"
        style={[styles.column, !stacked && styles.equalColumn]}
      >
        {left}
      </View>
      <View
        testID="comparison-column-b"
        style={[styles.column, !stacked && styles.equalColumn]}
      >
        {right}
      </View>
    </View>
  );
}
function DeviceLabel({
  product,
  side,
  stacked,
}: {
  product: Product;
  side: 'A' | 'B';
  stacked: boolean;
}) {
  const { shared } = useDetailStyles();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.deviceLabel, !stacked && styles.alignedDeviceLabel]}>
      <Text style={styles.side}>CİHAZ {side}</Text>
      <Text style={shared.title}>{product.name}</Text>
    </View>
  );
}
function PriceMetrics({
  product,
  other,
  score,
  winner,
}: {
  product: Product;
  other: Product;
  score: number | null;
  winner: boolean;
}) {
  const { shared } = useDetailStyles();
  const styles = useThemedStyles(createStyles);

  return (
    <>
      {(
        [
          ['Hızlı Satış', 'marketPriceMin'],
          ['Adil Değer', 'fairPrice'],
          ['Fırsatçı İlan', 'marketPriceMax'],
        ] as const
      ).map(([label, key]) => (
        <View key={key} style={styles.metric}>
          <Text style={shared.caption}>{label}</Text>
          <Text
            style={[styles.price, product[key] < other[key] && styles.better]}
          >
            {money(product[key])}
          </Text>
        </View>
      ))}
      <View style={styles.scoreBox}>
        <Text style={shared.caption}>Değer Skoru · Fiyat / Risk</Text>
        <Text style={[styles.valueScore, winner && styles.better]}>
          {score === null ? 'Kategoriler farklı' : `${score} / 100`}
        </Text>
      </View>
    </>
  );
}
function RiskDetails({ product, other }: { product: Product; other: Product }) {
  const { colors, shared } = useDetailStyles();
  const styles = useThemedStyles(createStyles);
  const SEVERITIES: Record<Severity, { label: string; color: string }> = {
    high: { label: 'Yüksek', color: colors.dangerText },
    medium: { label: 'Orta', color: colors.amber },
    low: { label: 'Düşük', color: colors.successText },
  };

  const risk = calculateHardwareRisk(product.chronicIssues);
  const better = risk.score < calculateHardwareRisk(other.chronicIssues).score;
  return (
    <>
      <View
        style={[
          styles.riskBadge,
          { borderColor: better ? colors.green : riskColor(risk, colors) },
        ]}
      >
        <ShieldCheck
          size={20}
          color={better ? colors.green : riskColor(risk, colors)}
        />
        <View style={styles.shrink}>
          <Text style={[styles.riskScore, { color: riskColor(risk, colors) }]}>
            {risk.score} / 10
          </Text>
          <Text style={[shared.caption, { color: riskColor(risk, colors) }]}>
            {risk.level}
          </Text>
        </View>
      </View>
      <Text style={shared.caption}>
        {product.chronicIssues.length} kayıtlı sorun
      </Text>
      {product.chronicIssues.map((issue) => (
        <View key={issue.id} style={styles.issue}>
          <View
            style={[
              shared.pill,
              { backgroundColor: `${SEVERITIES[issue.severity].color}18` },
            ]}
          >
            <Text
              style={[
                shared.pillText,
                { color: SEVERITIES[issue.severity].color },
              ]}
            >
              {SEVERITIES[issue.severity].label}
            </Text>
          </View>
          <Text style={shared.title}>{issue.title}</Text>
          <Text style={shared.body}>{issue.description}</Text>
          <Text style={styles.repair}>
            Tahmini Onarım / Bakım: {issue.estimatedRepairCost}
          </Text>
        </View>
      ))}
      {product.chronicIssues.length === 0 && (
        <Text style={shared.body}>
          Kayıtlı sorun yok; bu, arıza bulunmadığı garantisi değildir.
        </Text>
      )}
    </>
  );
}
function InspectionDetails({ product }: { product: Product }) {
  const { colors, shared } = useDetailStyles();
  const styles = useThemedStyles(createStyles);

  const { tools, difficulty } = inspectionRequirements(product);
  return (
    <>
      <Text style={styles.price}>{product.checklist.length} kontrol adımı</Text>
      <Text
        style={[
          shared.title,
          {
            color:
              difficulty === 'Zor'
                ? colors.dangerText
                : difficulty === 'Orta'
                  ? colors.amber
                  : colors.successText,
          },
        ]}
      >
        Kontrol Zorluğu: {difficulty}
      </Text>
      <Text style={shared.caption}>Kontrol Araçları</Text>
      <View style={styles.tools}>
        {tools.map((tool) => (
          <View key={tool} style={shared.pill}>
            <Text style={shared.pillText}>{tool}</Text>
          </View>
        ))}
      </View>
      {product.checklist.map((item) => (
        <Text key={item.id} style={shared.body}>
          • {item.title}
        </Text>
      ))}
    </>
  );
}

export default function CompareScreen({
  navigation,
  products,
  onChange,
  listings,
  onSwap,
}: Props) {
  const { colors, shared } = useDetailStyles();
  const styles = useThemedStyles(createStyles);

  const [picker, setPicker] = useState<ComparisonSlot | null>(null);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const availableWidth = width - insets.left - insets.right;
  const stacked = availableWidth < 600;
  const [a, b] = products;
  const comparison = a && b ? compareProducts(a, b) : null;

  function selectProduct(product: Product) {
    Keyboard.dismiss();
    if (picker === 'a') onChange([product, b]);
    if (picker === 'b') onChange([a, product]);
    setPicker(null);
  }

  function slot(product: Product | null, side: ComparisonSlot) {
    return (
      <Pressable
        testID={`comparison-slot-${side}`}
        accessibilityRole="button"
        accessibilityLabel={
          side === 'a' ? 'Cihaz A (Sol) seç' : 'Cihaz B (Sağ) seç'
        }
        accessibilityHint={product?.name ?? 'Katalogdan bir cihaz seçin.'}
        onPress={() => setPicker(side)}
        style={({ pressed }) => [
          styles.slot,
          stacked && styles.stackedSlot,
          pressed && shared.pressed,
        ]}
      >
        <View style={shared.row}>
          <Text style={styles.side}>
            {side === 'a' ? 'CİHAZ A (SOL)' : 'CİHAZ B (SAĞ)'}
          </Text>
          <ChevronDown size={18} color={colors.cyan} />
        </View>
        <Text style={shared.title}>
          {product?.name ?? 'Karşılaştırmak için cihaz seçin'}
        </Text>
        <Text style={shared.caption}>
          {product
            ? `${product.brand} · ${product.releaseYear} · ${money(product.fairPrice)}`
            : 'Model veya marka ile ara'}
        </Text>
      </Pressable>
    );
  }

  return (
    <SafeAreaView
      testID="compare-safe-area"
      edges={['top', 'left', 'right']}
      style={styles.flex}
    >
      {navigation}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          testID="compare-screen"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'web' ? 'none' : 'on-drag'}
          contentContainerStyle={[
            styles.page,
            availableWidth < 375 && styles.compactPage,
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text accessibilityRole="header" style={styles.heading}>
                Donanım Kıyasla <Text style={styles.vs}>VS</Text>
              </Text>
              <ThemeToggle />
            </View>
            <Text style={shared.body}>
              İki cihazı fiyat, kayıtlı risk ve kontrol gereksinimleriyle yan
              yana değerlendirin.
            </Text>
          </View>
          <View
            testID="comparison-selectors"
            style={[styles.selectors, stacked && styles.stacked]}
          >
            {slot(a, 'a')}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cihazların yerini değiştir"
              disabled={!a && !b}
              aria-disabled={!a && !b}
              onPress={() => (onSwap ? onSwap() : onChange([b, a]))}
              style={({ pressed }) => [
                styles.swap,
                !a && !b && styles.disabled,
                pressed && shared.pressed,
              ]}
            >
              <ArrowLeftRight size={22} color={colors.cyan} />
            </Pressable>
            {slot(b, 'b')}
          </View>

          {listings && a && b && (
            <View testID="saved-listings-comparison" style={shared.card}>
              <Text style={shared.heading}>Kaydedilen İlan Kıyaslaması</Text>
              <PairColumns
                stacked={stacked}
                left={
                  <>
                    <Text style={shared.pillText}>İLAN A</Text>
                    <SavedListingSummary item={listings[0]} product={a} />
                  </>
                }
                right={
                  <>
                    <Text style={shared.pillText}>İLAN B</Text>
                    <SavedListingSummary item={listings[1]} product={b} />
                  </>
                }
              />
              <Text style={shared.title}>
                {listings[0].askedPrice === listings[1].askedPrice
                  ? 'İki ilanın istenen fiyatı aynı.'
                  : `İlan ${listings[0].askedPrice < listings[1].askedPrice ? 'A' : 'B'}, ${savedMoney(Math.abs(listings[0].askedPrice - listings[1].askedPrice))} daha hesaplı.`}
              </Text>
              <Text style={shared.caption}>
                İlan fiyatlarını kondisyon ve onarım ihtiyacıyla birlikte
                değerlendirin. Aşağıdaki donanım metrikleri katalogdaki piyasa
                referanslarıdır.
              </Text>
            </View>
          )}

          {!a || !b ? (
            <View style={shared.card}>
              <Text style={shared.heading}>İki cihaz seçerek başlayın</Text>
              <Text style={shared.body}>
                Her iki alandan {a || b ? 'eksik cihazı' : 'birer cihazı'}{' '}
                seçin. Arama ve kategori filtreleriyle tüm katalogdan seçim
                yapabilirsiniz.
              </Text>
            </View>
          ) : (
            comparison && (
              <>
                {comparison.sameProduct && !listings && (
                  <View style={shared.card}>
                    <Text style={shared.body}>
                      Aynı ürün iki tarafta seçili. Farklı model veya
                      yapılandırma seçebilirsiniz.
                    </Text>
                  </View>
                )}
                {!comparison.comparable && (
                  <View style={shared.card}>
                    <Text style={[shared.title, { color: colors.amber }]}>
                      Farklı kategoriler karşılaştırılıyor
                    </Text>
                    <Text style={shared.body}>
                      Fiyat ve risk bilgileri gösterilir; ortak bir performans
                      veya değer kazananı hesaplanmaz.
                    </Text>
                  </View>
                )}

                <View style={shared.card}>
                  <Text accessibilityRole="header" style={shared.heading}>
                    Piyasa Fiyatı & Değer Skoru
                  </Text>
                  <View
                    testID="comparison-price-difference"
                    style={styles.difference}
                  >
                    <Text style={styles.differenceText}>
                      {comparison.cheaper
                        ? `Cihaz ${comparison.cheaper.toUpperCase()} ~${money(comparison.priceDifference)} daha hesaplı`
                        : 'İki cihazın adil fiyatı eşit'}
                    </Text>
                  </View>
                  <PairColumns
                    stacked={stacked}
                    left={
                      <>
                        <DeviceLabel product={a} side="A" stacked={stacked} />
                        <PriceMetrics
                          product={a}
                          other={b}
                          score={comparison.valueScores?.[0] ?? null}
                          winner={comparison.valueWinner === 'a'}
                        />
                      </>
                    }
                    right={
                      <>
                        <DeviceLabel product={b} side="B" stacked={stacked} />
                        <PriceMetrics
                          product={b}
                          other={a}
                          score={comparison.valueScores?.[1] ?? null}
                          winner={comparison.valueWinner === 'b'}
                        />
                      </>
                    }
                  />
                  <Text style={shared.caption}>
                    Değer skoru bu iki cihaz arasında hesaplanır: %65 fiyat
                    uygunluğu + %35 düşük kayıtlı risk. Ölçülmüş performans veya
                    ilan fırsat puanı değildir. Yeşil fiyat, ilgili satırdaki
                    düşük tutarı gösterir.
                  </Text>
                </View>
                <View style={shared.card}>
                  <Text accessibilityRole="header" style={shared.heading}>
                    Kronik Sorun & Risk Skoru
                  </Text>
                  <PairColumns
                    stacked={stacked}
                    left={
                      <>
                        <DeviceLabel product={a} side="A" stacked={stacked} />
                        <RiskDetails product={a} other={b} />
                      </>
                    }
                    right={
                      <>
                        <DeviceLabel product={b} side="B" stacked={stacked} />
                        <RiskDetails product={b} other={a} />
                      </>
                    }
                  />
                  <Text style={shared.caption}>
                    VS risk endeksi: yüksek 4, orta 2, düşük 1 puan; toplam en
                    fazla 10. 0–3 düşük, 4–6 orta, 7–10 yüksek risk. Bu puan
                    arıza olasılığı değildir; ana ekrandaki 100 puanlık
                    endeksten farklıdır.
                  </Text>
                </View>
                <View style={shared.card}>
                  <Text accessibilityRole="header" style={shared.heading}>
                    Ekspertiz ve Kontrol Zorluğu
                  </Text>
                  <PairColumns
                    stacked={stacked}
                    left={
                      <>
                        <DeviceLabel product={a} side="A" stacked={stacked} />
                        <InspectionDetails product={a} />
                      </>
                    }
                    right={
                      <>
                        <DeviceLabel product={b} side="B" stacked={stacked} />
                        <InspectionDetails product={b} />
                      </>
                    }
                  />
                  <Text style={shared.caption}>
                    Araçlar kontrol adımlarından türetilir. Daha az adım veya
                    araç, cihazın daha güvenilir olduğu anlamına gelmez.
                  </Text>
                </View>
                <View
                  testID="comparison-verdict"
                  style={[shared.card, styles.verdict]}
                  accessibilityLiveRegion="polite"
                >
                  <Text accessibilityRole="header" style={shared.heading}>
                    SecondCheck Tavsiye Kararı
                  </Text>
                  <Text style={styles.verdictTitle}>
                    {comparison.valueVerdict}
                  </Text>
                  <Text style={shared.title}>{comparison.riskVerdict}</Text>
                  <Text style={shared.body}>{comparison.explanation}</Text>
                  <Text style={shared.caption}>
                    Karar katalog verilerine dayalı kurallarla üretilir.
                    Performans ölçümü veya gerçek cihaz ekspertizi içermez.
                  </Text>
                </View>
              </>
            )
          )}
          <Text style={shared.caption}>
            Fiyatlar katalog referanslarıdır. İlan kondisyonu ve gerçek bakım
            maliyetleri değişebilir; kesin ekspertiz yerine geçmez.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
      {picker && (
        <ProductPickerModal
          key={picker}
          slotLabel={picker === 'a' ? 'Cihaz A (Sol)' : 'Cihaz B (Sağ)'}
          selectedProduct={picker === 'a' ? a : b}
          onSelect={selectProduct}
          onClose={() => setPicker(null)}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1, minWidth: 0, backgroundColor: colors.bg },
    scroll: { flex: 1, minHeight: 0 },
    compactPage: { paddingHorizontal: 16 },
    stackedSlot: {
      flexGrow: 0,
      flexShrink: 0,
      flexBasis: 'auto',
      minHeight: 44,
    },
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
    headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    heading: {
      flex: 1,
      minWidth: 0,
      color: colors.text,
      fontSize: 27,
      lineHeight: 36,
      fontWeight: '800',
      flexShrink: 1,
    },
    vs: { color: colors.cyan, fontSize: 18 },
    selectors: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
    stacked: { flexDirection: 'column' },
    slot: {
      minHeight: 44,
      flex: 1,
      minWidth: 0,
      gap: 12,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.blue,
      backgroundColor: colors.cardBg,
    },
    side: {
      color: colors.cyan,
      fontSize: 11,
      lineHeight: 18,
      fontWeight: '800',
      letterSpacing: 0.5,
      flexShrink: 1,
    },
    swap: {
      width: 44,
      height: 44,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 22,
      backgroundColor: colors.accentSoft,
    },
    disabled: { opacity: 0.4 },
    columns: { flexDirection: 'row', alignItems: 'stretch', gap: 12 },
    column: {
      minWidth: 0,
      gap: 14,
      padding: 14,
      borderRadius: 12,
      backgroundColor: colors.inset,
      borderWidth: 1,
      borderColor: colors.border,
    },
    equalColumn: { flex: 1 },
    deviceLabel: {
      gap: 6,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    alignedDeviceLabel: { minHeight: 112 },
    metric: { gap: 5 },
    price: {
      color: colors.text,
      fontSize: 19,
      lineHeight: 27,
      fontWeight: '700',
      flexShrink: 1,
    },
    better: { color: colors.successText },
    scoreBox: {
      gap: 7,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
    },
    valueScore: {
      color: colors.cyan,
      fontSize: 16,
      lineHeight: 23,
      fontWeight: '700',
    },
    difference: {
      padding: 12,
      borderRadius: 10,
      backgroundColor: colors.successBg,
    },
    differenceText: {
      color: colors.successText,
      fontSize: 14,
      lineHeight: 22,
      fontWeight: '600',
      flexShrink: 1,
    },
    riskBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      padding: 12,
      borderRadius: 10,
    },
    riskScore: { fontSize: 23, lineHeight: 29, fontWeight: '800' },
    shrink: { flex: 1, minWidth: 0 },
    issue: {
      gap: 9,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
    },
    repair: {
      color: colors.successText,
      fontSize: 12,
      lineHeight: 20,
      flexShrink: 1,
    },
    tools: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    verdict: { borderColor: colors.blue },
    verdictTitle: {
      color: colors.cyan,
      fontSize: 16,
      lineHeight: 25,
      fontWeight: '700',
      flexShrink: 1,
    },
  });
