import Pressable from './AnimatedPressable';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import type { ThemeColors } from '../context/ThemeContext';
import { memo, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import type { Product } from '../types/product';
import { generatePriceTrend } from '../utils/priceTrend';
import { useDetailStyles } from './detailStyles';

const CHART_HEIGHT = 184;
const CHART_FONT =
  Platform.OS === 'ios'
    ? 'System'
    : Platform.OS === 'android'
      ? 'sans-serif'
      : 'system-ui';
const money = (price: number): string =>
  `${price.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL`;
const percentage = (value: number): string =>
  Math.abs(value).toLocaleString('tr-TR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

function PriceTrendSection({ product }: { product: Product }) {
  const { colors, shared } = useDetailStyles();
  const styles = useThemedStyles(createStyles);

  const trend = useMemo(() => generatePriceTrend(product), [product]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [width, setWidth] = useState(300);
  const compactControls = width < 6 * 44;
  const selected =
    trend.points.find((point) => point.key === selectedKey) ?? trend.points[5];
  const selectedIndex = trend.points.findIndex(
    (point) => point.key === selected?.key,
  );
  const prices = trend.points.map((point) => point.averagePrice);
  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);
  // Include headroom and a minimum 10% vertical domain to avoid exaggerating
  // tiny fluctuations on stable products. Values and curve share this scale.
  const padding = Math.max((maximum - minimum) * 0.2, product.fairPrice * 0.05);
  const bottom = Math.max(0, minimum - padding);
  const top = maximum + padding;
  const coordinates = trend.points.map((point, index) => ({
    x: (width * (index + 0.5)) / 6,
    y: 42 + (1 - (point.averagePrice - bottom) / (top - bottom)) * 96,
  }));
  const line = coordinates
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const first = coordinates[0];
  const last = coordinates[5];
  const fill =
    first && last ? `${line} L ${last.x} 148 L ${first.x} 148 Z` : '';
  const falling = trend.netChangePercentage < 0;
  const signedNet = `${falling ? '−' : '+'}${percentage(trend.netChangePercentage)}%`;
  const monthlyLabel =
    trend.monthlyChangePercentage < 0 ? 'Değer Kaybı' : 'Değer Artışı';
  const gradientId = `price-trend-${product.id}`;

  return (
    <View testID="price-trend-section" style={shared.card}>
      <Text accessibilityRole="header" style={shared.heading}>
        Son 6 Aylık Piyasa Değer Değişimi
      </Text>
      <View style={shared.row}>
        <View
          style={[
            shared.pill,
            { backgroundColor: falling ? colors.dangerBg : colors.successBg },
          ]}
        >
          <Text
            testID="price-trend-badge"
            style={[
              shared.pillText,
              { color: falling ? colors.dangerText : colors.successText },
            ]}
          >
            {signedNet} {falling ? 'Değer Kaybı' : 'Sabit/Artış'}
          </Text>
        </View>
        <Text style={shared.caption}>Simüle veri · Ortalama fiyat (TL)</Text>
      </View>
      <View
        testID="price-trend-chart"
        style={[styles.chart, compactControls && styles.compactChart]}
        onLayout={(event) => {
          const measured = event.nativeEvent.layout.width;
          if (measured > 0) setWidth(measured);
        }}
      >
        <Svg
          width="100%"
          height={CHART_HEIGHT}
          viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
        >
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.blue} stopOpacity={0.28} />
              <Stop offset="1" stopColor={colors.blue} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {[60, 104, 148].map((y) => (
            <Line
              key={y}
              x1={0}
              y1={y}
              x2={width}
              y2={y}
              stroke={colors.border}
              strokeDasharray="3 5"
            />
          ))}
          <Path d={fill} fill={`url(#${gradientId})`} />
          <Path
            d={line}
            stroke={colors.blue}
            strokeWidth={9}
            opacity={0.14}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <Path
            d={line}
            stroke={colors.blue}
            strokeWidth={2.5}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {trend.points.map((point, index) => {
            const position = coordinates[index];
            if (!position) return null;
            const active = index === selectedIndex;
            return (
              <ChartPoint
                key={point.key}
                x={position.x}
                y={position.y}
                active={active}
                label={point.monthLabel}
                price={point.averagePrice}
                fontSize={width < 360 ? 10 : 12}
              />
            );
          })}
        </Svg>
        <View
          style={[styles.hitAreas, compactControls && styles.compactHitAreas]}
        >
          {trend.points.map((point) => (
            <Pressable
              key={point.key}
              testID={`trend-month-${point.key}`}
              accessibilityRole="button"
              accessibilityLabel={`${point.monthLabel} ${point.year}: ${money(point.averagePrice)}`}
              accessibilityHint="Simüle aylık ortalama ve dönem açıklamasını gösterir."
              accessibilityState={{ selected: point.key === selected?.key }}
              aria-pressed={point.key === selected?.key}
              onPress={() => setSelectedKey(point.key)}
              style={({ pressed }) => [
                styles.monthHitArea,
                compactControls && styles.compactMonth,
                pressed && styles.monthPressed,
              ]}
            >
              {compactControls && (
                <Text style={styles.monthText}>{point.monthLabel}</Text>
              )}
            </Pressable>
          ))}
        </View>
      </View>
      <Text style={shared.caption}>
        Ayrıntı için bir aya dokunun. Son nokta mevcut adil fiyattır.
      </Text>
      <View
        testID="price-trend-tooltip"
        accessibilityLiveRegion="polite"
        style={[shared.item, styles.tooltip]}
      >
        <Text style={shared.title}>
          {selected?.monthLabel} {selected?.year} · Simüle ortalama
        </Text>
        <Text style={styles.selectedPrice}>
          {money(selected?.averagePrice ?? product.fairPrice)}
        </Text>
        <Text style={shared.body}>{selected?.annotation}</Text>
      </View>
      <View style={styles.takeaway}>
        <Text style={styles.metric}>
          Aylık Ortalama {monthlyLabel}: ~%
          {percentage(trend.monthlyChangePercentage)}
        </Text>
        <Text style={shared.body}>Alım Tavsiyesi: {trend.advice}</Text>
      </View>
      <Text style={shared.caption}>
        Bu grafik gerçek ilan geçmişi değildir. Adil fiyat, cihaz yaşı ve
        kategoriye dayalı tekrarlanabilir bir simülasyondur; gelecek fiyatları
        öngörmez.
      </Text>
    </View>
  );
}

// SVG-only children keep the plot valid on both native and web renderers.
function ChartPoint({
  x,
  y,
  active,
  label,
  price,
  fontSize,
}: {
  x: number;
  y: number;
  active: boolean;
  label: string;
  price: number;
  fontSize: number;
}) {
  const { colors } = useTheme();

  return (
    <>
      {active && (
        <Circle cx={x} cy={y} r={11} fill={colors.cyan} opacity={0.18} />
      )}
      <Circle
        cx={x}
        cy={y}
        r={active ? 5 : 3.5}
        fill={active ? colors.cyan : colors.blue}
        stroke={colors.pointStroke}
        strokeWidth={active ? 2 : 1}
      />
      <SvgText
        x={x}
        y={y - 18}
        fill={active ? colors.cyan : colors.muted}
        fontFamily={CHART_FONT}
        fontSize={fontSize}
        fontWeight="600"
        textAnchor="middle"
      >
        {price.toLocaleString('tr-TR')}
      </SvgText>
      <SvgText
        x={x}
        y={174}
        fill={active ? colors.cyan : colors.muted}
        fontFamily={CHART_FONT}
        fontSize={12}
        textAnchor="middle"
      >
        {label}
      </SvgText>
    </>
  );
}

export default memo(PriceTrendSection);

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    chart: { width: '100%', height: CHART_HEIGHT, minWidth: 0 },
    hitAreas: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      flexDirection: 'row',
    },
    monthHitArea: { flex: 1, minWidth: 44, minHeight: 44, borderRadius: 8 },
    compactChart: { height: CHART_HEIGHT + 96 },
    compactHitAreas: { top: CHART_HEIGHT, flexWrap: 'wrap' },
    compactMonth: {
      flexGrow: 0,
      flexShrink: 0,
      flexBasis: '33.333333%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    monthText: { color: colors.cyan, fontSize: 13 },
    monthPressed: { backgroundColor: `${colors.cyan}10` },
    tooltip: { minHeight: 148, justifyContent: 'center', gap: 6 },
    selectedPrice: {
      color: colors.cyan,
      fontSize: 22,
      lineHeight: 29,
      fontWeight: '700',
      flexShrink: 1,
    },
    takeaway: { gap: 10, minWidth: 0 },
    metric: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 21,
      fontWeight: '600',
      flexShrink: 1,
      flexWrap: 'wrap',
    },
  });
