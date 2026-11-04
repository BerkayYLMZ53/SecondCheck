import Pressable from './AnimatedPressable';
import { useState } from 'react';
import { FlatList, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { Bookmark, CheckSquare, Square, Trash2, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSavedListings } from '../context/SavedListingsContext';
import { useThemedStyles } from '../context/ThemeContext';
import type { ThemeColors } from '../context/ThemeContext';
import { getProductById } from '../data/devices';
import type { SavedItem } from '../types/savedListing';
import { useDetailStyles } from './detailStyles';
import SavedListingSummary from './SavedListingSummary';

interface Props {
  onClose: () => void;
  onLoad: (item: SavedItem) => void;
  onCompare?: (a: SavedItem, b: SavedItem) => void;
}
export default function SavedListingsModal({
  onClose,
  onLoad,
  onCompare,
}: Props) {
  const {
    savedListings,
    removeListing,
    clearListings,
    isReady,
    storageMessage,
  } = useSavedListings();
  const { colors, shared } = useDetailStyles();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const selected = selectedIds.flatMap((id) => {
    const item = savedListings.find((listing) => listing.id === id);
    return item ? [item] : [];
  });
  const a = selected[0];
  const b = selected[1];
  const categoryA = a ? getProductById(a.productId)?.category : undefined;
  const categoryB = b ? getProductById(b.productId)?.category : undefined;
  const canCompare = !!(
    a &&
    b &&
    categoryA &&
    categoryA === categoryB &&
    onCompare
  );
  function toggle(item: SavedItem) {
    setNotice(null);
    if (selectedIds.includes(item.id))
      setSelectedIds((current) => current.filter((id) => id !== item.id));
    else if (selected.length < 2)
      setSelectedIds([...selected.map((listing) => listing.id), item.id]);
    else
      setNotice('En fazla iki ilan seçebilirsiniz. Önce bir seçimi kaldırın.');
  }
  return (
    <Modal
      visible
      transparent
      animationType={Platform.OS === 'web' ? 'none' : 'fade'}
      accessibilityLabel="Kaydedilen ilanlar"
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
          style={styles.sheet}
          accessibilityViewIsModal
          testID="saved-listings-modal"
        >
          <View style={styles.header}>
            <View style={styles.heading}>
              <Bookmark size={22} color={colors.accent} />
              <Text style={shared.heading}>
                Kaydedilenler ({savedListings.length})
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kaydedilenler penceresini kapat"
              onPress={onClose}
              style={styles.iconButton}
            >
              <X size={22} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.info}>
            <Text style={shared.body}>
              İki ilan seçin; aynı kategorideki ilanları fiyatları ve notlarıyla
              kıyaslayın.
            </Text>
            {storageMessage && (
              <Text accessibilityRole="alert" style={styles.warning}>
                {storageMessage}
              </Text>
            )}
            {notice && (
              <Text accessibilityLiveRegion="polite" style={styles.warning}>
                {notice}
              </Text>
            )}
            {savedListings.length > 0 &&
              (confirmClear ? (
                <View style={styles.confirmActions}>
                  <Text style={[shared.body, styles.confirmText]}>
                    Tüm kayıtlar silinsin mi?
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setSelectedIds([]);
                      setConfirmClear(false);
                      void clearListings();
                    }}
                    style={[shared.button, styles.rowAction]}
                  >
                    <Text style={styles.warning}>Evet, Tümünü Sil</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setConfirmClear(false)}
                    style={[shared.button, styles.rowAction]}
                  >
                    <Text style={shared.buttonText}>Vazgeç</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setConfirmClear(true)}
                  style={styles.clearButton}
                >
                  <Trash2 size={15} color={colors.dangerText} />
                  <Text style={styles.warning}>Listeyi Temizle</Text>
                </Pressable>
              ))}
          </View>
          <FlatList
            data={savedListings}
            keyExtractor={(item) => item.id}
            extraData={selectedIds}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            initialNumToRender={8}
            maxToRenderPerBatch={10}
            windowSize={5}
            ListEmptyComponent={
              <View style={shared.item}>
                <Text style={shared.heading}>
                  {isReady
                    ? 'Henüz kaydedilmiş ilan yok'
                    : 'İlanlar yükleniyor…'}
                </Text>
                <Text style={shared.body}>
                  Bir fiyat analizi yaptıktan sonra “Bu İlanı Listeme Kaydet”
                  düğmesine dokunun.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const product = getProductById(item.productId);
              const checked = selectedIds.includes(item.id);
              return (
                <View
                  testID={`saved-listing-${item.id}`}
                  style={[shared.item, checked && styles.selected]}
                >
                  <Pressable
                    testID="saved-listing-select"
                    accessibilityRole="checkbox"
                    accessibilityLabel={`${item.title} kıyaslamaya ekle`}
                    accessibilityState={{ checked, disabled: !product }}
                    aria-checked={checked}
                    disabled={!product}
                    onPress={() => toggle(item)}
                    style={styles.selectButton}
                  >
                    {checked ? (
                      <CheckSquare size={22} color={colors.accent} />
                    ) : (
                      <Square size={22} color={colors.muted} />
                    )}
                    <Text style={shared.body}>
                      {checked ? 'Kıyaslama için seçildi' : 'Kıyaslamaya ekle'}
                    </Text>
                  </Pressable>
                  <SavedListingSummary item={item} product={product} />
                  <View style={styles.actions}>
                    <Pressable
                      testID="saved-listing-load"
                      accessibilityRole="button"
                      disabled={!product}
                      accessibilityState={{ disabled: !product }}
                      onPress={() => onLoad(item)}
                      style={({ pressed }) => [
                        shared.button,
                        styles.rowAction,
                        pressed && shared.pressed,
                      ]}
                    >
                      <Text style={shared.buttonText}>Analizi Yükle</Text>
                    </Pressable>
                    <Pressable
                      testID="saved-listing-remove"
                      accessibilityRole="button"
                      accessibilityLabel={`${item.title} ilanını kaldır`}
                      onPress={() => {
                        setSelectedIds((current) =>
                          current.filter((id) => id !== item.id),
                        );
                        void removeListing(item.id);
                      }}
                      style={({ pressed }) => [
                        shared.button,
                        styles.rowAction,
                        styles.remove,
                        pressed && shared.pressed,
                      ]}
                    >
                      <Trash2 size={16} color={colors.dangerText} />
                      <Text style={styles.warning}>Kaldır</Text>
                    </Pressable>
                  </View>
                </View>
              );
            }}
          />
          <View style={styles.footer}>
            <Text accessibilityLiveRegion="polite" style={shared.caption}>
              {selected.length} / 2 ilan seçili
              {a && b && categoryA !== categoryB
                ? ' • Aynı kategoriden iki ilan seçin.'
                : ''}
            </Text>
            <Pressable
              testID="compare-saved-listings"
              accessibilityRole="button"
              disabled={!canCompare}
              accessibilityState={{ disabled: !canCompare }}
              onPress={() => {
                if (canCompare && a && b) onCompare?.(a, b);
              }}
              style={({ pressed }) => [
                styles.compareButton,
                !canCompare && styles.disabled,
                pressed && shared.pressed,
              ]}
            >
              <Text style={styles.compareText}>Bu İki İlanı Kıyasla</Text>
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
      paddingHorizontal: 12,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sheet: {
      width: '100%',
      maxWidth: 680,
      minWidth: 0,
      height: '100%',
      maxHeight: 900,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 20,
      overflow: 'hidden',
    },
    header: {
      padding: 16,
      gap: 8,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    heading: {
      flex: 1,
      minWidth: 0,
      gap: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconButton: {
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 10,
      borderRadius: 12,
      backgroundColor: colors.inset,
    },
    info: { paddingHorizontal: 16, paddingTop: 14, gap: 10 },
    list: { flexGrow: 1, padding: 16, gap: 14, paddingBottom: 40 },
    selectButton: {
      minWidth: 44,
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    selected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSelected,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 8,
    },
    rowAction: {
      flex: 1,
      minWidth: 0,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    confirmActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'stretch',
      gap: 8,
    },
    confirmText: { width: '100%' },
    remove: { flexDirection: 'row', gap: 6, backgroundColor: colors.dangerBg },
    clearButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 44,
      minWidth: 44,
      alignSelf: 'flex-start',
    },
    warning: {
      color: colors.dangerText,
      fontSize: 13,
      lineHeight: 19,
      flexShrink: 1,
    },
    footer: {
      padding: 16,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    compareButton: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      minHeight: 48,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    compareText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.onAccent,
      textAlign: 'center',
    },
    disabled: { opacity: 0.45 },
  });
