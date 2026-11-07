// Android-only surface: keep native blur out of this module graph.
import { useEffect, useId, useState } from 'react';
import { Animated, AppState, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { useReducedMotion } from '../utils/useReducedMotion';

/** @param {{ active?: boolean, compact?: boolean, label?: string, testID?: string, style?: import('react-native').StyleProp<import('react-native').ViewStyle> }} props */
export default function SkeletonCard({ active = true, compact = false, label = 'İçerik hazırlanıyor…', testID = 'skeleton-card', style }) {
  const { theme } = useTheme();
  const reduced = useReducedMotion();
  const [phase] = useState(() => new Animated.Value(0));
  const [width, setWidth] = useState(320);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const id = useId().replace(/:/g, '');
  const dark = theme === 'dark';
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => listener.remove();
  }, []);
  useEffect(() => {
    phase.setValue(0);
    if (!active || !foreground || reduced) return;
    const animation = Animated.loop(Animated.timing(phase, {
      toValue: 1, duration: 1450, easing: Easing.inOut(Easing.quad),
      useNativeDriver: Platform.OS !== 'web', isInteraction: false,
    }));
    animation.start();
    return () => { animation.stop(); phase.stopAnimation(); };
  }, [active, foreground, reduced, phase]);
  const block = { backgroundColor: dark ? 'rgba(225,242,255,0.07)' : 'rgba(15,23,42,0.07)' };
  return <View testID={testID} accessibilityRole="progressbar" accessibilityLabel={label} accessibilityState={{ busy: true }}
    onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    style={[styles.card, { backgroundColor: dark ? 'rgba(22,30,46,0.82)' : 'rgba(241,245,249,0.8)', borderColor: dark ? '#b9f8ff1f' : '#94a3b833' }, style]}>
    <Text style={[styles.caption, { color: dark ? '#a8bbce' : '#475569' }]}>{label}</Text>
    <View style={styles.header} accessible={false}><View style={[styles.avatar, block]} /><View style={styles.grow}>
      <View style={[styles.title, block]} /><View style={[styles.subtitle, block]} />
    </View></View>
    <View accessible={false} style={[styles.price, compact && styles.compactPrice, block]} />
    {Array.from({ length: compact ? 2 : 4 }, (_, index) => <View key={index} style={styles.row} accessible={false}>
      <View style={[styles.checkbox, block]} /><View style={[styles.line, block]} />
    </View>)}
    {!reduced && active && foreground && <Animated.View pointerEvents="none" accessible={false} style={[styles.sweep, {
      width: width * 0.6, transform: [{ translateX: phase.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.65, width * 1.15] }) }, { skewX: '-16deg' }],
    }]}>
      <Svg width="100%" height="100%"><Defs><LinearGradient id={`${id}sweep`} x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0" stopColor="#ffffff" stopOpacity="0" /><Stop offset="0.5" stopColor="#ffffff" stopOpacity={dark ? 0.16 : 0.7} />
        <Stop offset="0.65" stopColor="#00f2fe" stopOpacity={dark ? 0.12 : 0.16} /><Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
      </LinearGradient></Defs><Rect width="100%" height="100%" fill={`url(#${id}sweep)`} /></Svg>
    </Animated.View>}
  </View>;
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  card: { width: '100%', minWidth: 0, padding: 20, gap: 17, borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  caption: { fontSize: 12, lineHeight: 19 }, header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 15 }, grow: { flex: 1, gap: 10 },
  title: { width: '78%', height: 18, borderRadius: 7 }, subtitle: { width: '48%', height: 11, borderRadius: 6 },
  price: { height: 92, borderRadius: 15 }, compactPrice: { height: 48 }, row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  checkbox: { width: 20, height: 20, borderRadius: 5 }, line: { flex: 1, height: 13, borderRadius: 6 },
  sweep: { position: 'absolute', left: 0, top: -30, bottom: -30 },
});
