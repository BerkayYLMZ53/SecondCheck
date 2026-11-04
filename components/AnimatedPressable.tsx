import { forwardRef, useEffect, useState } from 'react';
import type { ComponentRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet } from 'react-native';
import type { PressableProps } from 'react-native';
import { playHaptic } from '../utils/haptics';
import type { HapticKind } from '../utils/haptics';
import { useReducedMotion } from '../utils/useReducedMotion';

const Surface = Animated.createAnimatedComponent(Pressable);
export interface AnimatedPressableProps extends PressableProps {
  haptic?: HapticKind | false;
  pressScale?: number;
}

/** Animate the actual surface: preserve flex layout, hit area, refs and ARIA. */
const AnimatedPressable = forwardRef<ComponentRef<typeof Pressable>, AnimatedPressableProps>(function AnimatedPressable({
  style, children, disabled, onPress, onPressIn, onPressOut, haptic, pressScale = 0.96, ...props
}, ref) {
  const reduced = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const [scale] = useState(() => new Animated.Value(1));
  const effectivePressed = pressed && !disabled;
  const resolved = typeof style === 'function' ? style({ pressed: effectivePressed }) : style;
  const flattened = StyleSheet.flatten(resolved);
  const kind = haptic !== undefined ? haptic :
    ['checkbox', 'radio', 'switch'].includes(props.accessibilityRole ?? '') ? 'medium' :
      props.accessible === false ? false : 'light';
  useEffect(() => {
    scale.stopAnimation();
    if (reduced || disabled) scale.setValue(1);
    return () => scale.stopAnimation();
  }, [scale, reduced, disabled]);
  const animate = (value: number) => {
    scale.stopAnimation();
    if (reduced || disabled) { scale.setValue(1); return; }
    Animated.spring(scale, { toValue: value, stiffness: 650, damping: 30, mass: 0.45,
      useNativeDriver: Platform.OS !== 'web', isInteraction: false }).start();
  };
  return <Surface {...props} ref={ref} disabled={disabled}
    style={[resolved, { transform: [...(Array.isArray(flattened?.transform) ? flattened.transform : []), { scale }] }]}
    onPressIn={(event) => { if (!disabled) { setPressed(true); animate(pressScale); } onPressIn?.(event); }}
    onPressOut={(event) => { setPressed(false); animate(1); onPressOut?.(event); }}
    onPress={(event) => { if (disabled) return; if (kind && onPress) void playHaptic(kind); onPress?.(event); }}>
    {typeof children === 'function' ? children({ pressed: effectivePressed }) : children}
  </Surface>;
});
export default AnimatedPressable;
