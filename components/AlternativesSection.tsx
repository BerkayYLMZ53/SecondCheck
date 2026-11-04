import { useThemedStyles } from '../context/ThemeContext';
import type { ThemeColors } from '../context/ThemeContext';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowUpRight } from 'lucide-react-native';
import { getProductById } from '../data/devices';
import type { Product } from '../types/product';
import { useDetailStyles } from './detailStyles';

interface AlternativesSectionProps {
  product: Product;
  onSelectProduct: (product: Product) => void;
  onCompareProducts?: (a: Product, b: Product) => void;
}

function priceComparison(current: Product, alternative: Product): string {
  const difference = alternative.fairPrice - current.fairPrice;
  if (difference === 0) return 'Aynı adil fiyat';
  return `${Math.abs(difference).toLocaleString('tr-TR')} TL ${difference < 0 ? 'daha uygun' : 'ek bütçe'} · örnek adil fiyat`;
}

export default function AlternativesSection({
  product,
  onSelectProduct,
  onCompareProducts,
}: AlternativesSectionProps) {
  const { colors, shared } = useDetailStyles();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={shared.card}>
      <Text accessibilityRole="header" style={shared.heading}>
        Akıllı Alternatifler
      </Text>
      <Text style={shared.body}>
        İhtiyacınıza ve bütçenize göre bu modelleri de karşılaştırın.
      </Text>
      {product.alternatives.length === 0 && (
        <Text style={shared.body}>
          Bu ürün için kayıtlı alternatif bulunmuyor.
        </Text>
      )}
      {product.alternatives.map((alternative) => {
        const target = getProductById(alternative.id);
        return (
          <View key={alternative.id} style={shared.item}>
            <Text style={shared.title}>{alternative.name}</Text>
            <View style={shared.pill}>
              <Text style={shared.pillText}>
                {target
                  ? priceComparison(product, target)
                  : alternative.priceDiffNote}
              </Text>
            </View>
            {target && (
              <Text style={shared.caption}>{alternative.priceDiffNote}</Text>
            )}
            <View style={styles.reason}>
              <Text style={styles.bullet}>•</Text>
              <Text style={[shared.body, styles.reasonText]}>
                {alternative.reason}
              </Text>
            </View>
            <Pressable
              testID="alternative-inspect"
              accessibilityRole="button"
              accessibilityLabel={`${alternative.name}: Bu Cihazı İncele`}
              accessibilityState={{ disabled: !target }}
              aria-disabled={!target}
              disabled={!target}
              onPress={() => {
                if (target) onSelectProduct(target);
              }}
              style={({ pressed }) => [
                shared.button,
                styles.inspectButton,
                !target && styles.disabled,
                pressed && shared.pressed,
              ]}
            >
              <Text style={shared.buttonText}>Bu Cihazı İncele</Text>
              <ArrowUpRight size={18} color={colors.cyan} />
            </Pressable>
            {target && onCompareProducts && (
              <Pressable
                testID="alternative-compare"
                accessibilityRole="button"
                accessibilityLabel={`${alternative.name}: Bu İki Cihazı Kıyasla`}
                onPress={() => onCompareProducts(product, target)}
                style={({ pressed }) => [
                  shared.button,
                  styles.inspectButton,
                  pressed && shared.pressed,
                ]}
              >
                <Text style={shared.buttonText}>Bu İki Cihazı Kıyasla</Text>
              </Pressable>
            )}
            {!target && (
              <Text style={shared.caption}>
                Bu model henüz ürün veri tabanında yer almıyor.
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    reason: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      minWidth: 0,
      gap: 8,
    },
    bullet: { color: colors.cyan, fontSize: 18, lineHeight: 21 },
    reasonText: { flex: 1, minWidth: 0 },
    inspectButton: {
      minWidth: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    disabled: { opacity: 0.4 },
  });
