import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Check, TriangleAlert, Zap } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useReducedMotion } from '../utils/useReducedMotion';
import { statusPillWidth } from '../utils/sheetMotion';

export type DynamicStatus = { phase: 'idle' | 'loading' | 'success' | 'error'; label: string; sequence: number };
export default function DynamicStatusPill({ status, active = true }: { status: DynamicStatus; active?: boolean }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [appearance] = useState(() => new Animated.Value(0));
  const [size] = useState(() => new Animated.Value(210));
  const show = active && status.phase !== 'idle';
  useEffect(() => {
    const animation = reduced ? Animated.timing(appearance, { toValue: show ? 1 : 0, duration: 0, useNativeDriver: false })
      : Animated.spring(appearance, { toValue: show ? 1 : 0, stiffness: 300, damping: 24, mass: 0.65, useNativeDriver: false });
    animation.start(); return () => animation.stop();
  }, [show, appearance, reduced]);
  useEffect(() => {
    const animation = reduced ? Animated.timing(size, { toValue: statusPillWidth(status.label, width), duration: 0, useNativeDriver: false })
      : Animated.spring(size, { toValue: statusPillWidth(status.label, width), stiffness: 220, damping: 24, mass: 0.8, useNativeDriver: false });
    animation.start(); return () => animation.stop();
  }, [status.label, status.phase, status.sequence, width, size, reduced]);
  const dark = theme === 'dark';
  const color = dark ? '#f8fafc' : '#0f172a';
  return <View pointerEvents="none" style={[styles.position, { top: insets.top + 10 }]} aria-hidden={!show} accessibilityElementsHidden={!show} importantForAccessibility={show ? 'auto' : 'no-hide-descendants'}>
    <Animated.View testID="dynamic-status-pill" accessibilityLiveRegion="polite" accessibilityRole="status" accessibilityLabel={show ? status.label : undefined}
      style={[styles.pill, { width: size, opacity: appearance, backgroundColor: dark ? '#0b0f19f5' : '#fffffff5', borderColor: dark ? '#334155' : '#e2e8f0',
        transform: [{ translateY: appearance.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) }, { scale: appearance.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
        ...(Platform.OS === 'web' ? { boxShadow: dark ? '0 8px 28px #00000055' : '0 6px 24px #0f172a20' } : { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 10 }),
      }]}>
      {status.phase === 'success' ? <Check size={17} color={dark ? '#6ee7b7' : '#047857'} /> : status.phase === 'error' ? <TriangleAlert size={17} color={dark ? '#fdba74' : '#9a3412'} /> : <Zap size={17} color={dark ? '#67e8f9' : '#0369a1'} />}
      <Text numberOfLines={1} style={[styles.label, { color }]}>{status.label}</Text>
    </Animated.View>
  </View>;
}
const styles = StyleSheet.create({
  position: { position: 'absolute', zIndex: 1100, left: 16, right: 16, alignItems: 'center' },
  pill: { minHeight: 43, maxWidth: '100%', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 28, borderWidth: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  label: { flexShrink: 1, fontSize: 12, lineHeight: 18, fontWeight: '700', letterSpacing: 0.1 },
});
