import Pressable from './AnimatedPressable';
import { useThemedStyles } from '../context/ThemeContext';
import type { ThemeColors } from '../context/ThemeContext';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CheckSquare, RotateCcw, Square } from 'lucide-react-native';
import type { Product } from '../types/product';
import { useDetailStyles } from './detailStyles';
import { playHaptic } from '../utils/haptics';

interface Props {
  product: Product;
  onProgressChange?: (
    productId: string,
    checkedIds: ReadonlySet<string>,
  ) => void;
}
export default function InspectionChecklist({
  product,
  onProgressChange,
}: Props) {
  const { colors, shared } = useDetailStyles();
  const styles = useThemedStyles(createStyles);

  const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const total = product.checklist.length;
  const completed = product.checklist.filter((item) =>
    checkedIds.has(item.id),
  ).length;
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  useEffect(() => {
    onProgressChange?.(product.id, checkedIds);
  }, [product.id, checkedIds, onProgressChange]);

  function toggle(id: string) {
    if (!checkedIds.has(id)) void playHaptic('light');
    setCheckedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <View style={shared.card}>
      <Text accessibilityRole="header" style={shared.heading}>
        Alırken Nelere Bakılmalı?
      </Text>
      <View style={shared.row}>
        <Text accessibilityLiveRegion="polite" style={styles.progressText}>
          Test Tamamlandı: {completed} / {total}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Listeyi Sıfırla"
          accessibilityState={{ disabled: completed === 0 }}
          disabled={completed === 0}
          onPress={() => setCheckedIds(new Set())}
          style={({ pressed }) => [
            styles.reset,
            completed === 0 && styles.disabled,
            pressed && shared.pressed,
          ]}
        >
          <RotateCcw size={15} color={colors.cyan} />
          <Text style={shared.pillText}>Listeyi Sıfırla</Text>
        </Pressable>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Kontrol listesi ilerlemesi"
        accessibilityValue={{
          min: 0,
          max: total || 1,
          now: completed,
          text: `${completed} / ${total} test tamamlandı`,
        }}
        aria-valuemin={0}
        aria-valuemax={total || 1}
        aria-valuenow={completed}
        aria-valuetext={`${completed} / ${total} test tamamlandı`}
        style={styles.track}
      >
        <View style={[styles.fill, { width: `${percentage}%` }]} />
      </View>
      {total === 0 && (
        <Text style={shared.body}>
          Bu ürün için kayıtlı kontrol adımı bulunmuyor.
        </Text>
      )}
      {product.checklist.map((item) => {
        const checked = checkedIds.has(item.id);
        return (
          <Pressable
            key={item.id}
            accessibilityRole="checkbox"
            accessibilityLabel={item.title}
            accessibilityHint={`${item.targetArea}. ${item.instruction}`}
            accessibilityState={{ checked }}
            aria-checked={checked}
            onPress={() => toggle(item.id)}
            style={({ pressed }) => [
              shared.item,
              styles.checkItem,
              checked && styles.checkedItem,
              pressed && shared.pressed,
            ]}
          >
            <View style={styles.checkbox}>
              {checked ? (
                <CheckSquare size={24} color={colors.green} />
              ) : (
                <Square size={24} color={colors.muted} />
              )}
            </View>
            <View style={styles.content}>
              <View style={shared.pill}>
                <Text style={shared.pillText}>{item.targetArea}</Text>
              </View>
              <Text style={[shared.title, checked && styles.completedTitle]}>
                {item.title}
              </Text>
              <Text style={shared.body}>{item.instruction}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    progressText: { color: colors.text, fontSize: 13, fontWeight: '600' },
    reset: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 4,
    },
    disabled: { opacity: 0.45 },
    track: {
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    fill: { height: '100%', backgroundColor: colors.green, borderRadius: 4 },
    checkItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      minWidth: 44,
      minHeight: 44,
    },
    checkbox: { flexShrink: 0, width: 24, paddingTop: 2 },
    checkedItem: {
      borderColor: colors.checkedBorder,
      backgroundColor: colors.checkedBg,
    },
    content: { flex: 1, minWidth: 0, gap: 8 },
    completedTitle: {
      textDecorationLine: 'line-through',
      color: colors.successText,
    },
  });
