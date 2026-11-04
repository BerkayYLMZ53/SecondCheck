import Pressable from './AnimatedPressable';
import { memo, useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Camera, ScanFace, BatteryCharging, Usb, X } from 'lucide-react-native';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import type { ThemeColors } from '../context/ThemeContext';
import type { DeviceItem } from '../types/catalog';
import { getDeviceTestGuides } from '../utils/deviceTestGuides';
import type { TestPoint } from '../utils/deviceTestGuides';
import { useReducedMotion } from '../utils/useReducedMotion';

const POINTS = [
  { id: 'screen', top: 24, left: 88, icon: ScanFace, label: 'Ekran ve biyometri test noktası' },
  { id: 'camera', top: 94, left: 32, icon: Camera, label: 'Kamera test noktası' },
  { id: 'battery', top: 197, left: 88, icon: BatteryCharging, label: 'Batarya test noktası' },
  { id: 'port', top: 304, left: 88, icon: Usb, label: 'Alt port ve kasa test noktası' },
] as const;

export default memo(function DeviceTeardownView({ device, active = true }: { device: DeviceItem; active?: boolean }) {
  const { theme, colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const reduced = useReducedMotion();
  const [pulse] = useState(() => new Animated.Value(0));
  const [reveal] = useState(() => new Animated.Value(1));
  const [selected, setSelected] = useState<TestPoint | null>(null);
  const guides = useMemo(() => getDeviceTestGuides(device), [device]);
  const guide = guides.find((item) => item.id === selected);
  useEffect(() => {
    if (reduced || !active) { pulse.setValue(0); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(pulse, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulse, reduced, active]);
  useEffect(() => {
    if (!selected || !active) return;
    reveal.setValue(reduced ? 1 : 0);
    const animation = Animated.timing(reveal, { toValue: 1, duration: reduced ? 0 : 230, useNativeDriver: Platform.OS !== 'web' });
    animation.start();
    return () => animation.stop();
  }, [selected, reveal, reduced, active]);
  const glass: ViewStyle & { backdropFilter?: string; WebkitBackdropFilter?: string } = Platform.OS === 'web'
    ? { backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)' } : {};

  return (
    <View style={styles.section} testID="device-teardown">
      <Text accessibilityRole="header" style={styles.heading}>İnteraktif donanım röntgeni</Text>
      <Text style={styles.caption}>Bir test noktasına dokunun; buluşmada uygulayabileceğiniz 30 saniyelik kontrolü görün.</Text>
      <View style={styles.phone}>
        <Svg width={220} height={368} viewBox="0 0 220 368" {...(Platform.OS === 'web' ? { 'aria-hidden': true } : { accessible: false })}>
          <Defs><LinearGradient id="phone-shell" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={colors.accentSoft} /><Stop offset="1" stopColor={colors.inset} /></LinearGradient></Defs>
          <Rect x={10} y={3} width={200} height={360} rx={34} fill="url(#phone-shell)" stroke={colors.cyan} strokeOpacity={0.5} strokeWidth={1.5} />
          <Rect x={18} y={11} width={184} height={344} rx={28} fill={colors.inset} stroke={colors.cardBorder} />
          <Rect x={79} y={20} width={62} height={15} rx={8} fill={colors.track} />
          <Rect x={29} y={67} width={75} height={79} rx={18} fill={colors.cardBg} stroke={colors.cardBorder} />
          {[{x:49,y:87},{x:83,y:87},{x:49,y:121}].slice(0,device.brand === 'Apple' && /Pro/.test(device.model) ? 3 : 2).map((p) => <Circle key={`${p.x}:${p.y}`} cx={p.x} cy={p.y} r={12} fill={colors.bg} stroke={colors.cyan} strokeOpacity={0.4} />)}
          <Rect x={55} y={166} width={110} height={114} rx={15} fill={colors.accentSoft} fillOpacity={0.5} stroke={colors.cyan} strokeOpacity={0.25} strokeDasharray="5 5" />
          <Path d="M106 188h14l-10 23h13l-22 35 5-27H94z" fill={colors.cyan} opacity={0.25} />
          <Path d="M40 157h140M40 291h140M110 40v25M110 281v43" stroke={colors.cyan} strokeOpacity={0.18} strokeDasharray="3 6" />
          <Rect x={89} y={343} width={42} height={5} rx={3} fill={colors.track} />
        </Svg>
        {POINTS.map((point) => {
          const Icon = point.icon;
          return <Pressable key={point.id} testID={`teardown-${point.id}`} accessibilityRole="button" accessibilityLabel={point.label}
            accessibilityState={{ expanded: selected === point.id }} onPress={() => setSelected(selected === point.id ? null : point.id)}
            style={[styles.point, { top: point.top, left: point.left }]}>
            <Animated.View pointerEvents="none" style={[styles.pulse, {
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.5] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) }],
            }]} />
            <View style={[styles.pointCore, selected === point.id && styles.selected]}><Icon size={19} color={selected === point.id ? colors.onAccent : colors.cyan} /></View>
          </Pressable>;
        })}
      </View>
      <Text style={styles.diagramNote}>{device.brand} · Şematik test haritası; gerçek parça yerleşimi değildir.</Text>
      {guide && <Animated.View testID="teardown-guide" style={[styles.guide, glass, {
        backgroundColor: theme === 'dark' ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.92)',
        opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
      }]}>
        <View style={styles.row}><View style={styles.grow}><Text style={styles.eyebrow}>30 SANİYELİK KONTROL</Text><Text style={styles.heading}>{guide.title}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Test bilgisini kapat" onPress={() => setSelected(null)} style={styles.close}><X size={19} color={colors.textPrimary} /></Pressable></View>
        {guide.steps.map((step, index) => <View key={step} style={styles.step}><Text style={styles.number}>{index + 1}</Text><Text style={styles.stepText}>{step}</Text></View>)}
      </Animated.View>}
    </View>
  );
});

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: { gap: 12 }, heading: { color: colors.textPrimary, fontSize: 17, lineHeight: 25, fontWeight: '700' },
  caption: { color: colors.textSecondary, fontSize: 12, lineHeight: 20 },
  phone: { width: 220, height: 368, alignSelf: 'center', marginTop: 6 },
  point: { position: 'absolute', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pulse: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: colors.cyan },
  pointCore: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.cyan, backgroundColor: colors.cardBg, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: colors.accent, borderColor: colors.accent },
  diagramNote: { color: colors.textSecondary, fontSize: 10, lineHeight: 17, textAlign: 'center' },
  guide: { padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, grow: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.cyan, fontSize: 9, lineHeight: 17, fontWeight: '800', letterSpacing: 1.2 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' }, number: { color: colors.cyan, fontSize: 14, lineHeight: 22, fontWeight: '800' },
  stepText: { flex: 1, minWidth: 0, color: colors.textPrimary, fontSize: 12, lineHeight: 21 },
});
