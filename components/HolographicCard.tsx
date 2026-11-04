import { memo, useId } from 'react';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

/** Keep decoration inside the card's bounds. Perspective and oversized rotated
 * glare surfaces can escape rounded GPU clips inside a scrolling blur sheet. */
export default memo(function HolographicCard({ children, active = true }: { children: ReactNode; active?: boolean }) {
  const { theme, colors } = useTheme();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return <View testID="holographic-card" style={[styles.shell, { backgroundColor: colors.cardBorder }]}>
    <View pointerEvents="none" style={[styles.decoration, { opacity: active ? 1 : 0.8 }]}>
      <Svg {...(Platform.OS === 'web' ? { 'aria-hidden': true } : { accessible: false })} width="100%" height="100%">
        <Defs><LinearGradient id={`edge${id}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#22d3ee" stopOpacity={theme === 'dark' ? 0.8 : 0.25} />
          <Stop offset="0.55" stopColor="#10b981" stopOpacity={theme === 'dark' ? 0.55 : 0.15} />
          <Stop offset="1" stopColor="#38bdf8" stopOpacity={theme === 'dark' ? 0.8 : 0.25} />
        </LinearGradient></Defs>
        <Rect x={0} y={0} width="100%" height="100%" rx={22} fill={`url(#edge${id})`} />
      </Svg>
    </View>
    <View style={[styles.content, { backgroundColor: colors.inset }]}>{children}</View>
  </View>;
});
const styles = StyleSheet.create({
  shell: { width: '100%', minWidth: 0, padding: 1, borderRadius: 22, overflow: 'hidden' },
  decoration: { ...StyleSheet.absoluteFill, borderRadius: 22, overflow: 'hidden' },
  content: { minWidth: 0, borderRadius: 21, overflow: 'hidden' },
});
