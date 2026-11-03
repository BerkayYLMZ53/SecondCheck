import { memo, useEffect, useId, useRef, useState } from 'react';
import type { ComponentRef, ReactNode } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { useReducedMotion } from '../utils/useReducedMotion';

const NATIVE = Platform.OS !== 'web';
export default memo(function HolographicCard({ children, active = true }: { children: ReactNode; active?: boolean }) {
  const { theme, colors } = useTheme();
  const reduced = useReducedMotion();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const surface = useRef<ComponentRef<typeof View>>(null);
  const [size, setSize] = useState({ width: 300, height: 400 });
  const [motion] = useState(() => ({ x: new Animated.Value(0), y: new Animated.Value(0), glare: new Animated.Value(-1), opacity: new Animated.Value(0) }));
  const bounds = useRef({ x: 0, y: 0, width: 300, height: 400 });
  const point = useRef({ x: 0, y: 0 });
  const frame = useRef<number | null>(null);
  const enabled = active && !reduced;
  useEffect(() => {
    if (!enabled) {
      Object.values(motion).forEach((value) => { value.stopAnimation(); value.setValue(0); });
    }
    const pending = frame;
    return () => { if (pending.current !== null) cancelAnimationFrame(pending.current); pending.current = null; Object.values(motion).forEach((value) => value.stopAnimation()); };
  }, [enabled, motion]);
  const move = (x: number, y: number) => {
    if (!enabled) return;
    point.current = { x, y };
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const box = bounds.current;
      motion.x.setValue(Math.max(-1, Math.min(1, (point.current.x - box.x) / Math.max(1, box.width) * 2 - 1)));
      motion.y.setValue(Math.max(-1, Math.min(1, (point.current.y - box.y) / Math.max(1, box.height) * 2 - 1)));
    });
  };
  const shine = () => {
    if (!enabled) return;
    motion.glare.stopAnimation(); motion.opacity.stopAnimation(); motion.glare.setValue(-1); motion.opacity.setValue(0);
    Animated.parallel([
      Animated.timing(motion.glare, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE }),
      Animated.sequence([Animated.timing(motion.opacity, { toValue: 1, duration: 100, useNativeDriver: NATIVE }), Animated.delay(300), Animated.timing(motion.opacity, { toValue: 0, duration: 300, useNativeDriver: NATIVE })]),
    ]).start();
  };
  const start = (x: number, y: number) => {
    if (!enabled) return;
    motion.x.stopAnimation(); motion.y.stopAnimation();
    surface.current?.measureInWindow((left, top, width, height) => { bounds.current = { x: left, y: top, width, height }; move(x, y); });
    shine();
  };
  const settle = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null;
    if (!enabled) { motion.x.setValue(0); motion.y.setValue(0); return; }
    Animated.parallel([motion.x, motion.y].map((value) => Animated.spring(value, { toValue: 0, stiffness: 250, damping: 23, mass: 0.7, useNativeDriver: NATIVE }))).start();
  };
  const bandWidth = Math.min(180, size.width * 0.55);
  return <Animated.View testID="holographic-card" style={[styles.shell, {
    ...(theme === 'dark' ? Platform.OS === 'web' ? { boxShadow: '0 0 22px rgba(34, 211, 238, 0.12)' } : { shadowColor: '#22d3ee', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } } : {}),
    transform: [{ perspective: 1000 }, { rotateX: motion.y.interpolate({ inputRange: [-1, 1], outputRange: ['3deg', '-3deg'] }) }, { rotateY: motion.x.interpolate({ inputRange: [-1, 1], outputRange: ['-4deg', '4deg'] }) }],
  }]}>
    <View ref={surface} style={[styles.surface, { backgroundColor: colors.cardBorder }]} onLayout={(event) => {
      const { width, height } = event.nativeEvent.layout; setSize((previous) => previous.width === width && previous.height === height ? previous : { width, height });
    }} onTouchStart={(event) => start(event.nativeEvent.pageX, event.nativeEvent.pageY)} onTouchMove={(event) => move(event.nativeEvent.pageX, event.nativeEvent.pageY)} onTouchEnd={settle} onTouchCancel={settle}
      onPointerEnter={(event) => { if (Platform.OS === 'web' && event.nativeEvent.pointerType === 'mouse') start(event.nativeEvent.pageX, event.nativeEvent.pageY); }}
      onPointerDown={(event) => { if (Platform.OS === 'web' && event.nativeEvent.pointerType === 'mouse') start(event.nativeEvent.pageX, event.nativeEvent.pageY); }}
      onPointerMove={(event) => { if (Platform.OS === 'web' && event.nativeEvent.pointerType === 'mouse') move(event.nativeEvent.pageX, event.nativeEvent.pageY); }}
      onPointerLeave={() => { if (Platform.OS === 'web') settle(); }}>
      <Svg pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs><LinearGradient id={`edge${id}`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#22d3ee" stopOpacity={theme === 'dark' ? 0.8 : 0.25} /><Stop offset="0.55" stopColor="#10b981" stopOpacity={theme === 'dark' ? 0.55 : 0.15} /><Stop offset="1" stopColor="#38bdf8" stopOpacity={theme === 'dark' ? 0.8 : 0.25} /></LinearGradient></Defs>
        <Rect x={0} y={0} width="100%" height="100%" rx={22} fill={`url(#edge${id})`} />
      </Svg>
      <View style={[styles.content, { backgroundColor: colors.inset }]}>{children}</View>
      {enabled && <Animated.View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.glare, {
        width: bandWidth, height: size.height * 1.6, top: -size.height * 0.3, opacity: motion.opacity.interpolate({ inputRange: [0, 1], outputRange: [0, theme === 'dark' ? 0.2 : 0.12] }),
        transform: [{ translateX: motion.glare.interpolate({ inputRange: [-1, 1], outputRange: [-bandWidth * 2, size.width + bandWidth] }) }, { rotateZ: '-24deg' }],
      }]}><Svg width="100%" height="100%"><Defs><LinearGradient id={`glare${id}`} x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#ffffff" stopOpacity={0} /><Stop offset="0.5" stopColor="#ffffff" stopOpacity={0.85} /><Stop offset="1" stopColor="#ffffff" stopOpacity={0} /></LinearGradient></Defs><Rect width="100%" height="100%" fill={`url(#glare${id})`} /></Svg></Animated.View>}
    </View>
  </Animated.View>;
});
const styles = StyleSheet.create({
  shell: { borderRadius: 22 }, surface: { padding: 1, borderRadius: 22, overflow: 'hidden' }, content: { borderRadius: 21, overflow: 'hidden' }, glare: { position: 'absolute', left: 0 },
});
