import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import type { ThemeColors } from '../context/ThemeContext';
import { useReducedMotion } from '../utils/useReducedMotion';

export default function ListingSkeleton({ active = true }: { active?: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const reduced = useReducedMotion();
  const [phase] = useState(() => new Animated.Value(-1));
  const [width, setWidth] = useState(300);
  useEffect(() => {
    if (reduced || !active) return;
    const animation = Animated.loop(Animated.timing(phase, { toValue: 1, duration: 1350, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }));
    animation.start();
    return () => animation.stop();
  }, [phase, reduced, active]);
  return <View testID="listing-skeleton" accessibilityRole="progressbar" accessibilityLabel="İlan analizi hazırlanıyor" accessibilityState={{ busy: true }}
    onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={styles.card}>
    <Text style={styles.caption} accessibilityLiveRegion="polite">İlanınız hazırlanıyor…</Text>
    <View style={styles.header}><View style={[styles.block, styles.avatar]} /><View style={styles.grow}><View style={[styles.block, styles.title]} /><View style={[styles.block, styles.subtitle]} /></View></View>
    <View style={[styles.block, styles.price]} />
    {[0, 1, 2, 3].map((index) => <View key={index} style={styles.row}><View style={[styles.block, styles.checkbox]} /><View style={[styles.block, styles.line]} /></View>)}
    {!reduced && <Animated.View pointerEvents="none" style={[styles.shimmer, { backgroundColor: colors.pointStroke,
      transform: [{ translateX: phase.interpolate({ inputRange: [-1, 1], outputRange: [-width, width] }) }, { skewX: '-18deg' }],
    }]} />}
  </View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { gap: 20, padding: 20, borderRadius: 22, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg, overflow: 'hidden' },
  caption: { color: colors.textSecondary, fontSize: 12, lineHeight: 19 },
  block: { backgroundColor: colors.chipBg, borderRadius: 8 }, header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 15 }, grow: { flex: 1, gap: 10 },
  title: { width: '80%', height: 20 }, subtitle: { width: '50%', height: 12 }, price: { height: 106, width: '100%', borderRadius: 16 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' }, checkbox: { width: 22, height: 22, borderRadius: 5 }, line: { flex: 1, height: 15 },
  shimmer: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 100, opacity: 0.1 },
});
