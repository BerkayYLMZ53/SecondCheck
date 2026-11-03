import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { ArrowLeftRight, ClipboardCheck, House, UserRound } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export type AppTab = 'home' | 'diagnostics' | 'compare' | 'profile';

const TABS: readonly { id: AppTab; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Ana Sayfa', icon: House },
  { id: 'diagnostics', label: 'Teşhis / Checklist', icon: ClipboardCheck },
  { id: 'compare', label: 'Karşılaştırma', icon: ArrowLeftRight },
  { id: 'profile', label: 'Profil', icon: UserRound },
];
const NATIVE_DRIVER = Platform.OS !== 'web';

interface Props {
  activeTab: AppTab;
  onTabPress: (tab: AppTab) => void;
}

function DockButton({ tab, active, reducedMotion, onPress }: {
  tab: (typeof TABS)[number];
  active: boolean;
  reducedMotion: boolean;
  onPress: () => void;
}) {
  const { theme, colors } = useTheme();
  const [scale] = useState(() => new Animated.Value(1));
  const Icon = tab.icon;
  const animatePress = (value: number) => {
    scale.stopAnimation();
    if (reducedMotion) { scale.setValue(1); return; }
    Animated.spring(scale, { toValue: value, useNativeDriver: NATIVE_DRIVER, speed: 28, bounciness: 5 }).start();
  };
  return (
    <Animated.View style={[styles.tabContainer, { transform: [{ scale }] }]}>
      <Pressable testID={`dock-tab-${tab.id}`} accessibilityRole="tab" accessibilityLabel={tab.label}
        accessibilityState={{ selected: active }} aria-selected={active}
        onPressIn={() => animatePress(0.89)} onPressOut={() => animatePress(1)} onPress={onPress}
        style={styles.tab}>
        <View style={styles.iconPosition} pointerEvents="none">
          <Icon size={25} strokeWidth={active ? 2.2 : 1.7}
            color={active ? (theme === 'dark' ? colors.cyan : colors.accent) : colors.textSecondary} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function FloatingTabBar({ activeTab, onTabPress }: Props) {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [position] = useState(() => new Animated.Value(0));
  const tabWidth = Math.max(0, width - 18) / TABS.length;
  const activeIndex = Math.max(0, TABS.findIndex((tab) => tab.id === activeTab));
  const dark = theme === 'dark';

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => { if (mounted) setReducedMotion(enabled); }).catch(() => {});
    const reduced = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardOpen(false));
    return () => { mounted = false; reduced.remove(); show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    position.stopAnimation();
    if (reducedMotion) { position.setValue(activeIndex * tabWidth); return; }
    const animation = Animated.timing(position, {
      toValue: activeIndex * tabWidth, duration: 260,
      easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE_DRIVER,
    });
    animation.start();
    return () => animation.stop();
  }, [activeIndex, tabWidth, position, reducedMotion]);

  if (keyboardOpen) return null;

  const webGlass: ViewStyle & { backdropFilter?: string; WebkitBackdropFilter?: string } = Platform.OS === 'web'
    ? { backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)' } : {};
  const shadow: ViewStyle = Platform.OS === 'web'
    ? { boxShadow: dark ? '0px 10px 40px rgba(0, 0, 0, 0.35)' : '0px 8px 28px rgba(15, 23, 42, 0.14)' }
    : { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: dark ? 0.35 : 0.14, shadowRadius: 20, elevation: 12 };

  return (
    <View pointerEvents="box-none" style={[styles.position, {
      bottom: 10, left: 16 + insets.left, right: 16 + insets.right,
    }]}>
      <View testID="floating-tab-bar" accessibilityRole="tablist" accessibilityLabel="Ana navigasyon"
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={[styles.dock, webGlass, shadow, {
          backgroundColor: dark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.82)',
          borderColor: dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
        }]}>
        {tabWidth > 0 && (
          <Animated.View pointerEvents="none" testID="dock-active-indicator" style={[styles.activePill, {
            width: tabWidth, transform: [{ translateX: position }],
            backgroundColor: dark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(37, 99, 235, 0.09)',
            borderColor: dark ? 'rgba(125, 211, 252, 0.1)' : 'rgba(37, 99, 235, 0.06)',
            ...(Platform.OS === 'web' ? { boxShadow: `0px 0px 18px ${colors.accent}18` } : {}),
          }]}>
            <View style={[styles.activeDot, { backgroundColor: dark ? colors.cyan : colors.accent }]} />
          </Animated.View>
        )}
        {TABS.map((tab) => <DockButton key={tab.id} tab={tab} active={tab.id === activeTab}
          reducedMotion={reducedMotion} onPress={() => onTabPress(tab.id)} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  position: { position: 'absolute', zIndex: 50, alignItems: 'center' },
  dock: { width: '100%', maxWidth: 520, height: 68, borderRadius: 36, borderWidth: 1, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center' },
  tabContainer: { flex: 1, minWidth: 0, height: '100%' },
  tab: { flex: 1, minHeight: 48, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  iconPosition: { transform: [{ translateY: -2 }] },
  activePill: { position: 'absolute', left: 9, top: 8, height: 52, borderRadius: 28, borderWidth: 1, alignItems: 'center' },
  activeDot: { position: 'absolute', bottom: 5, height: 3, width: 13, borderRadius: 2 },
});
