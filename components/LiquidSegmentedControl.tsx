import Pressable from './AnimatedPressable';
import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useReducedMotion } from '../utils/useReducedMotion';
import { useSegmentKeyboard } from '../utils/useSegmentKeyboard';
import { triggerLight } from '../utils/haptics';

export interface LiquidSegment<T extends string> { value: T; label: string; icon: LucideIcon }
interface Props<T extends string> { options: readonly LiquidSegment<T>[]; value: T; onChange: (value: T) => void; active?: boolean; testID?: string; label?: string }
const NATIVE = Platform.OS !== 'web';
const SegmentButton = memo(function SegmentButton({ option, selected, active, reduced, onSelect, testID }: {
  option: LiquidSegment<string>; selected: boolean; active: boolean; reduced: boolean; onSelect: (value: string) => void; testID: string;
}) {
  const { colors } = useTheme();
  const [scale] = useState(() => new Animated.Value(1));
  const previous = useRef(selected);
  useEffect(() => {
    const changed = previous.current !== selected;
    previous.current = selected;
    scale.stopAnimation();
    if (!selected || !active || reduced || !changed) { scale.setValue(1); return; }
    const animation = Animated.sequence([
      Animated.spring(scale, { toValue: 1.16, stiffness: 500, damping: 18, mass: 0.55, useNativeDriver: NATIVE }),
      Animated.spring(scale, { toValue: 1, stiffness: 360, damping: 21, mass: 0.6, useNativeDriver: NATIVE }),
    ]);
    animation.start(); return () => animation.stop();
  }, [selected, active, reduced, scale]);
  const Icon = option.icon;
  return <Pressable haptic={false} testID={`${testID}-${option.value}`} accessibilityRole="tab" accessibilityLabel={option.label} accessibilityState={{ selected }} aria-selected={selected}
    tabIndex={selected ? 0 : -1} onPress={() => onSelect(option.value)} style={styles.tab}>
    <Animated.View pointerEvents="none" style={{ transform: [{ scale }] }}><Icon size={17} strokeWidth={selected ? 2.2 : 1.7} color={selected ? colors.cyan : colors.textSecondary} /></Animated.View>
    <Text numberOfLines={2} style={[styles.label, { color: selected ? colors.textPrimary : colors.textSecondary, fontWeight: selected ? '800' : '500' }]}>{option.label}</Text>
  </Pressable>;
});

export default function LiquidSegmentedControl<T extends string>({ options, value, onChange, active = true, testID, label = 'Ekspertiz bölümleri' }: Props<T>) {
  const { theme, colors } = useTheme();
  const reduced = useReducedMotion();
  const generated = useId();
  const id = testID ?? `liquid-segments-${generated}`;
  const [width, setWidth] = useState(0);
  const [position] = useState(() => new Animated.Value(0));
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  const segmentWidth = Math.max(0, width - 8) / Math.max(1, options.length);
  const values = useMemo(() => options.map((option) => option.value), [options]);
  const select = useCallback((next: string) => {
    if (active && next !== value && values.includes(next as T)) { void triggerLight(); onChange(next as T); }
  }, [active, value, onChange, values]);
  useSegmentKeyboard(id, values, select, active);
  useEffect(() => {
    position.stopAnimation();
    if (!active || reduced) { position.setValue(index * segmentWidth); return; }
    const animation = Animated.spring(position, { toValue: index * segmentWidth, stiffness: 300, damping: 24, mass: 0.75, useNativeDriver: NATIVE });
    animation.start(); return () => animation.stop();
  }, [index, segmentWidth, active, reduced, position]);
  return <View testID={id} accessibilityRole="tablist" accessibilityLabel={label} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    style={[styles.control, { backgroundColor: colors.inset, borderColor: colors.cardBorder }]}>
    {segmentWidth > 0 && <Animated.View pointerEvents="none" testID={`${id}-indicator`} style={[styles.indicator, {
      width: segmentWidth, backgroundColor: theme === 'dark' ? '#1c3349' : '#ffffff', borderColor: theme === 'dark' ? '#38bdf833' : '#cbd5e1', transform: [{ translateX: position }],
      ...(Platform.OS === 'web' ? { boxShadow: theme === 'dark' ? '0 0 12px #22d3ee12' : '0 2px 6px #0f172a0a' } : {}),
    }]} />}
    {options.map((option) => <SegmentButton key={option.value} option={option} selected={value === option.value} active={active} reduced={reduced} onSelect={select} testID={id} />)}
  </View>;
}
const styles = StyleSheet.create({
  control: { width: '100%', minWidth: 0, height: 70, padding: 4, borderRadius: 20, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  indicator: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 16, borderWidth: 1 },
  tab: { flex: 1, minWidth: 0, height: '100%', minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, gap: 4, borderRadius: 16 },
  label: { fontSize: 10, lineHeight: 12, textAlign: 'center' },
});
