import { useEffect, useRef, useState } from 'react';
import type { ComponentRef, ReactNode, RefObject } from 'react';
import { Animated, Easing, Keyboard, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useReducedMotion } from '../utils/useReducedMotion';
import { useSheetAccessibility } from '../utils/useSheetAccessibility';
import { sheetDragOffset, sheetHeight, shouldDismissSheet } from '../utils/sheetMotion';
import { useVisibleWindowHeight } from '../utils/useVisibleWindowHeight';

export interface SpringBottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  blurTarget?: RefObject<ComponentRef<typeof View> | null>;
  heightFraction?: number;
  testID?: string;
  resetKey?: string | number;
}

/** Mounted while closed so inspection state survives dismissal and reopening. */
export default function SpringBottomSheet({ open, onClose, title, children, blurTarget, heightFraction = 0.88, testID = 'spring-bottom-sheet', resetKey }: SpringBottomSheetProps) {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const viewportHeight = useVisibleWindowHeight();
  const [keyboardInset, setKeyboardInset] = useState(0);
  const height = sheetHeight(Math.max(160, viewportHeight - keyboardInset), insets.top, heightFraction);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const show = Keyboard.addListener('keyboardWillChangeFrame', (event) => setKeyboardInset(Math.max(0, viewportHeight - event.endCoordinates.screenY)));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardInset(0));
    return () => { show.remove(); hide.remove(); };
  }, [viewportHeight]);
  const reduced = useReducedMotion();
  const [present, setPresent] = useState(open);
  const [motion] = useState(() => new Animated.Value(0));
  const [drag] = useState(() => new Animated.Value(0));
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [resetKey]);
  useSheetAccessibility(open, testID, onClose);
  useEffect(() => {
    motion.stopAnimation(); drag.stopAnimation(); if (open) drag.setValue(0);
    // Visibility updates from an animation callback preserve the closing spring and mounted content.
    const animation = reduced || !open
      ? Animated.timing(motion, { toValue: open ? 1 : 0, duration: reduced ? 0 : 220, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' })
      : Animated.spring(motion, { toValue: 1, stiffness: 245, damping: 28, mass: 0.95, restSpeedThreshold: 0.01, useNativeDriver: Platform.OS !== 'web' });
    const frame = open ? requestAnimationFrame(() => setPresent(true)) : undefined;
    animation.start(({ finished }) => { if (finished && !open) setPresent(false); });
    return () => { if (frame !== undefined) cancelAnimationFrame(frame); animation.stop(); };
  }, [open, motion, drag, reduced]);
  const visible = open || present;
  const settle = () => {
    if (reduced) { drag.setValue(0); return; }
    Animated.spring(drag, { toValue: 0, stiffness: 290, damping: 26, mass: 0.8, useNativeDriver: Platform.OS !== 'web' }).start();
  };
  const gesture = PanResponder.create({
    onStartShouldSetPanResponder: () => open,
    onMoveShouldSetPanResponder: (_, state) => open && Math.abs(state.dy) > 7 && Math.abs(state.dy) > Math.abs(state.dx),
    onPanResponderGrant: () => drag.stopAnimation(),
    onPanResponderMove: (_, state) => drag.setValue(sheetDragOffset(state.dy)),
    onPanResponderRelease: (_, state) => { if (shouldDismissSheet(state.dy, state.vy, height)) onClose(); else settle(); },
    onPanResponderTerminate: settle,
    onPanResponderTerminationRequest: () => false,
  });
  const glass: ViewStyle & { backdropFilter?: string; WebkitBackdropFilter?: string } = Platform.OS === 'web'
    ? { backdropFilter: 'blur(28px) saturate(170%)', WebkitBackdropFilter: 'blur(28px) saturate(170%)' } : {};
  const backgroundColor = theme === 'dark' ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.94)';
  return <View pointerEvents={visible ? 'box-none' : 'none'} accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'} aria-hidden={!open}
    style={[styles.overlay, !visible && styles.hidden]} testID={testID}>
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: motion, backgroundColor: theme === 'dark' ? '#00000080' : '#0f172a40' }]} />
    <Pressable testID={`${testID}-backdrop`} accessible={false} focusable={false} accessibilityElementsHidden aria-hidden style={StyleSheet.absoluteFill} onPress={onClose} />
    <View pointerEvents="box-none" style={[styles.bottom, { paddingBottom: keyboardInset }]}>
      <Animated.View testID={`${testID}-panel`} accessibilityRole="dialog" accessibilityLabel={title} accessibilityViewIsModal={open} aria-modal={open}
        style={[styles.sheet, glass, { height, borderColor: colors.cardBorder, transform: [{ translateY: Animated.add(motion.interpolate({ inputRange: [0, 1], outputRange: [height + 30, 0] }), drag) }] }]}>
        {Platform.OS !== 'web' && visible && <BlurView pointerEvents="none" blurTarget={blurTarget} blurMethod="dimezisBlurViewSdk31Plus" tint={theme === 'dark' ? 'dark' : 'light'} intensity={48} style={StyleSheet.absoluteFill} />}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor }]} />
        <View testID="spring-sheet-drag-region" {...gesture.panHandlers} style={styles.dragRegion}>
          <View style={[styles.handle, { backgroundColor: colors.textSecondary }]} />
        </View>
        <View style={styles.header}><Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>{title}</Text>
            <Pressable testID={`${testID}-close`} accessibilityRole="button" accessibilityLabel={`${title} çekmecesini kapat`} onPress={onClose} style={[styles.close, { backgroundColor: colors.chipBg }]}><X size={20} color={colors.textPrimary} /></Pressable>
        </View>
        <ScrollView ref={scroll} testID={`${testID}-scroll`} style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}
          keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" nestedScrollEnabled showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </Animated.View>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 1000 }, hidden: { display: 'none' }, bottom: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 760, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden', borderWidth: 1, borderBottomWidth: 0 },
  dragRegion: { height: 30, alignItems: 'center', justifyContent: 'center' }, handle: { width: 40, height: 5, borderRadius: 3, opacity: 0.5 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingHorizontal: 18, paddingBottom: 8 }, title: { flex: 1, minWidth: 0, fontSize: 16, fontWeight: '800' }, close: { width: 44, height: 44, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1, minHeight: 0 }, content: { paddingHorizontal: 12, paddingTop: 6 },
});
