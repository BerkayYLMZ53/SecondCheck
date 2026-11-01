import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ThemeColors } from '../context/ThemeContext';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Check, Search, X } from 'lucide-react-native';
import { PRODUCTS_DATABASE } from '../data/mockProducts';
import type { Category, Product } from '../types/product';

export const COMPARISON_CATEGORIES: readonly {
  id: Category | 'all';
  label: string;
}[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'gpu', label: 'GPU' },
  { id: 'cpu', label: 'CPU' },
  { id: 'phone', label: 'Telefon' },
  { id: 'console', label: 'Konsol' },
  { id: 'laptop', label: 'Laptop' },
  { id: 'handheld', label: 'El Konsolu' },
  { id: 'ram', label: 'RAM' },
  { id: 'motherboard', label: 'Anakart' },
  { id: 'monitor', label: 'Monitör' },
];
const normalize = (text: string): string =>
  text
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
const INDEX = PRODUCTS_DATABASE.map((product) => ({
  product,
  text: normalize(`${product.name} ${product.brand}`),
}));
const ROW_HEIGHT = 108;
const money = (amount: number): string =>
  `${amount.toLocaleString('tr-TR')} TL`;

interface Props {
  slotLabel: string;
  selectedProduct: Product | null;
  onSelect: (product: Product) => void;
  onClose: () => void;
}
const ProductRow = memo(function ProductRow({
  product,
  selected,
  onSelect,
}: {
  product: Product;
  selected: boolean;
  onSelect: (product: Product) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      testID="comparison-picker-row"
      accessibilityRole="button"
      accessibilityLabel={`Seç: ${product.name}`}
      aria-selected={selected}
      accessibilityState={{ selected }}
      onPress={() => onSelect(product)}
      style={({ pressed }) => [
        styles.result,
        selected && styles.selectedResult,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle}>{product.name}</Text>
        <Text style={styles.resultMeta}>
          {product.brand} · {product.releaseYear} · {money(product.fairPrice)}
        </Text>
      </View>
      {selected && <Check size={20} color={colors.cyan} />}
    </Pressable>
  );
});

export default function ProductPickerModal({
  slotLabel,
  selectedProduct,
  onSelect,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'all'>(
    selectedProduct?.category ?? 'all',
  );
  const listRef = useRef<FlatList<Product>>(null);
  const results = useMemo(() => {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    return INDEX.filter(
      (entry) =>
        (category === 'all' || entry.product.category === category) &&
        tokens.every((token) => entry.text.includes(token)),
    ).map((entry) => entry.product);
  }, [query, category]);
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [query, category]);

  return (
    <Modal
      visible
      transparent
      animationType={Platform.OS === 'web' ? 'none' : 'fade'}
      accessibilityLabel={`${slotLabel} ürün seçimi`}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[
          styles.overlay,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 16),
            paddingLeft: Math.max(insets.left, 12),
            paddingRight: Math.max(insets.right, 12),
          },
        ]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.heading}>{slotLabel} · Ürün Seç</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ürün seçiciyi kapat"
              style={styles.iconButton}
              onPress={onClose}
            >
              <X size={22} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.search}>
            <Search size={19} color={colors.muted} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Model veya marka ara…"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Kıyaslama ürünü ara"
              autoCorrect={false}
              style={styles.input}
            />
            {!!query && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Kıyaslama aramasını temizle"
                style={styles.iconButton}
                onPress={() => setQuery('')}
              >
                <X size={18} color={colors.muted} />
              </Pressable>
            )}
          </View>
          <ScrollView
            horizontal
            testID="comparison-picker-categories"
            showsHorizontalScrollIndicator={false}
            style={styles.categories}
            contentContainerStyle={styles.categoryContent}
            keyboardShouldPersistTaps="handled"
          >
            {COMPARISON_CATEGORIES.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Kategori: ${item.label}`}
                accessibilityState={{ selected: category === item.id }}
                aria-pressed={category === item.id}
                onPress={() => setCategory(item.id)}
                style={({ pressed }) => [
                  styles.chip,
                  category === item.id && styles.activeChip,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    category === item.id && styles.activeChipText,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text accessibilityLiveRegion="polite" style={styles.caption}>
            {results.length} eşleşme · {PRODUCTS_DATABASE.length} ürün
          </Text>
          <FlatList
            ref={listRef}
            testID="comparison-picker-list"
            data={results}
            keyExtractor={(product) => product.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <ProductRow
                product={item}
                selected={selectedProduct?.id === item.id}
                onSelect={onSelect}
              />
            )}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={5}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'web' ? 'none' : 'on-drag'}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.resultTitle}>Ürün bulunamadı</Text>
                <Text style={styles.caption}>
                  Aramayı veya kategori filtresini değiştirin.
                </Text>
              </View>
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    sheet: {
      minWidth: 0,
      minHeight: 0,
      width: '100%',
      maxWidth: 680,
      height: '100%',
      maxHeight: 780,
      backgroundColor: colors.cardBg,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 14,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    heading: {
      flex: 1,
      minWidth: 0,
      color: colors.text,
      fontWeight: '700',
      fontSize: 18,
    },
    iconButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.inset,
      borderRadius: 12,
      paddingLeft: 12,
    },
    input: {
      flex: 1,
      minWidth: 0,
      minHeight: 48,
      color: colors.text,
      fontSize: 16,
    },
    categories: { flexGrow: 0, flexShrink: 0 },
    categoryContent: { gap: 8, paddingHorizontal: 16 },
    chip: {
      minWidth: 44,
      paddingHorizontal: 14,
      minHeight: 44,
      justifyContent: 'center',
      borderRadius: 22,
      backgroundColor: colors.chipBg,
    },
    activeChipText: { color: colors.onAccent },
    activeChip: { backgroundColor: colors.blue },
    chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
    caption: { color: colors.muted, fontSize: 12, lineHeight: 19 },
    list: { flex: 1, minHeight: 0 },
    listContent: { flexGrow: 1, paddingBottom: 40 },
    result: {
      minHeight: ROW_HEIGHT,
      borderBottomWidth: 1,
      borderColor: colors.border,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    selectedResult: { backgroundColor: colors.accentSoft },
    resultContent: { flex: 1, minWidth: 0, gap: 8 },
    resultTitle: {
      flexShrink: 1,
      flexWrap: 'wrap',
      color: colors.text,
      fontSize: 14,
      lineHeight: 21,
      fontWeight: '600',
    },
    resultMeta: {
      color: colors.cyan,
      fontSize: 12,
      lineHeight: 18,
      flexShrink: 1,
      flexWrap: 'wrap',
    },
    empty: { paddingVertical: 24, gap: 12 },
    pressed: { opacity: 0.75 },
  });
