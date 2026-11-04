import { useEffect, useId, useRef, useState } from 'react';
import {
  AccessibilityInfo, Animated, Easing, Image, Platform,
  StyleSheet, Text, View, useWindowDimensions,
} from 'react-native';
import { BlurTargetView, BlurView } from 'expo-blur';
import Svg, { Defs, LinearGradient, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import logo from '../assets/icon.png';

const MESSAGES = [
  'Kusur tespit modelleri yükleniyor...',
  'Piyasa endeksleri senkronize ediliyor...',
  'Sistem hazır.',
];
const NATIVE_DRIVER = Platform.OS !== 'web';

/**
 * Decorative startup sequence; the messages do not initiate network/model work.
 * @param {{ onFinish: () => void }} props
 */
export default function SplashScreen({ onFinish }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const compact = height < 620;
  const id = useId().replace(/:/g, '');
  const background = useRef(null);
  const finish = useRef(onFinish);
  const [phase, setPhase] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(/** @type {boolean | null} */ (null));
  const [exit] = useState(() => new Animated.Value(0));
  const [scan] = useState(() => new Animated.Value(0));
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => { finish.current = onFinish; }, [onFinish]);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => { if (active) setReducedMotion(value); })
      .catch(() => { if (active) setReducedMotion(false); });
    return () => { active = false; };
  }, []);

  // All animations and timers belong to this mount and are cancelled on cleanup.
  useEffect(() => {
    if (reducedMotion === null) return;
    let active = true;
    let completed = false;
    exit.setValue(0);
    scan.setValue(0);
    progress.setValue(0);
    /** @param {number} toValue */
    const fill = (toValue) => {
      Animated.spring(progress, {
        toValue, stiffness: 110, damping: 18, mass: 0.6,
        overshootClamping: true, useNativeDriver: false, isInteraction: false,
      }).start();
    };
    const scanner = Animated.loop(Animated.sequence([
      Animated.timing(scan, { toValue: 1, duration: 1350, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE_DRIVER, isInteraction: false }),
      Animated.timing(scan, { toValue: 0, duration: 1350, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE_DRIVER, isInteraction: false }),
    ]));
    if (!reducedMotion) scanner.start();
    fill(0.36);
    const timers = [
      setTimeout(() => { setPhase(1); fill(0.74); }, 600),
      setTimeout(() => { setPhase(2); fill(1); }, 1200),
      setTimeout(() => {
        scanner.stop();
        transition.start(({ finished }) => {
          if (active && finished && !completed) {
            completed = true;
            finish.current();
          }
        });
      }, 2000),
    ];
    const transition = Animated.timing(exit, {
      toValue: 1, duration: reducedMotion ? 120 : 380,
      easing: Easing.inOut(Easing.cubic), useNativeDriver: NATIVE_DRIVER,
      isInteraction: false,
    });
    return () => {
      active = false;
      timers.forEach(clearTimeout);
      scanner.stop();
      transition.stop();
      progress.stopAnimation();
    };
  }, [exit, progress, reducedMotion, scan]);

  const contentMotion = {
    opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    transform: [
      { translateY: exit.interpolate({ inputRange: [0, 1], outputRange: [0, reducedMotion ? 0 : -24] }) },
      { scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1, reducedMotion ? 1 : 0.96] }) },
    ],
  };

  return (
    <Animated.View testID="in-app-splash" style={[styles.overlay, { opacity: contentMotion.opacity }]}>
      <BlurTargetView ref={background} style={styles.fill} accessible={false} pointerEvents="none">
        <Svg width="100%" height="100%" style={styles.fill}>
          <Defs>
            <RadialGradient id={`${id}glow`} cx="50%" cy="42%" rx="65%" ry="52%">
              <Stop offset="0" stopColor="#00f2fe" stopOpacity="0.14" />
              <Stop offset="0.48" stopColor="#10b981" stopOpacity="0.045" />
              <Stop offset="1" stopColor="#0b0f19" stopOpacity="0" />
            </RadialGradient>
            <Pattern id={`${id}grid`} width="44" height="44" patternUnits="userSpaceOnUse">
              <Path d="M 44 0 L 0 0 0 44" fill="none" stroke="#00f2fe" strokeOpacity="0.055" strokeWidth="0.6" />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id}glow)`} />
          <Rect width="100%" height="100%" fill={`url(#${id}grid)`} />
        </Svg>
      </BlurTargetView>

      <Animated.View style={[styles.content, contentMotion, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.topLabel} accessible={false}>
          <View style={styles.dot} /><Text style={styles.eyebrow}>VISION AI · HARDWARE INTELLIGENCE</Text>
        </View>
        <View style={styles.brand}>
          <View style={[styles.orbit, compact && styles.orbitCompact]}>
            <View style={styles.innerOrbit} />
            <View style={styles.badge}>
              <Image source={logo} style={styles.logo} resizeMode="contain" accessible={false} />
              <Animated.View pointerEvents="none" style={[styles.laser, {
                opacity: reducedMotion ? 0 : 1,
                transform: [{ translateY: scan.interpolate({ inputRange: [0, 1], outputRange: [0, 132] }) }],
              }]}>
                <Svg width="100%" height="28">
                  <Defs><LinearGradient id={`${id}laser`} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#00f2fe" stopOpacity="0" />
                    <Stop offset="1" stopColor="#00f2fe" stopOpacity="0.28" />
                  </LinearGradient></Defs>
                  <Rect width="100%" height="28" fill={`url(#${id}laser)`} />
                </Svg>
                <View style={styles.laserLine} />
              </Animated.View>
            </View>
            <View style={[styles.corner, styles.topLeft]} /><View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={[styles.title, compact && styles.titleCompact]}>SecondCheck</Text>
          <Text style={styles.slogan}>AI-Powered Hardware Appraisal</Text>
          <View style={styles.brandRule} />
        </View>

        <View style={styles.footer}>
          <View style={styles.pill}>
            <BlurView pointerEvents="none" tint="dark" intensity={35} blurTarget={background} blurMethod="dimezisBlurViewSdk31Plus" style={styles.fill} />
            <View style={styles.statusRow}>
              <View style={styles.dot} />
              <Text style={styles.status} accessibilityRole="text" accessibilityLiveRegion="polite">{MESSAGES[phase]}</Text>
              <Text style={styles.step} accessible={false}>0{phase + 1} / 03</Text>
            </View>
            <View style={styles.track} accessibilityRole="progressbar" accessibilityLabel="SecondCheck başlatılıyor" accessibilityValue={{ min: 0, max: 100, text: MESSAGES[phase] }} accessibilityState={{ busy: phase < 2 }}>
              <Animated.View style={[styles.progress, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'], extrapolate: 'clamp' }) }]} />
            </View>
          </View>
          {!compact && <Text style={styles.footerLabel}>PRECISION. CONFIDENCE. SECOND CHECK.</Text>}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 1000, backgroundColor: '#0b0f19' },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 20 },
  topLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#10b981' },
  eyebrow: { color: '#7e9ca8', fontSize: 9, letterSpacing: 1.6, textAlign: 'center' },
  brand: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  orbit: { width: 224, height: 224, borderRadius: 112, borderWidth: 1, borderColor: '#00f2fe18', justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  orbitCompact: { width: 184, height: 184, borderRadius: 92, marginBottom: 16 },
  innerOrbit: { position: 'absolute', width: 178, height: 178, borderRadius: 89, borderWidth: 1, borderColor: '#10b98120' },
  badge: { width: 140, height: 140, borderRadius: 34, backgroundColor: '#0d1922', borderColor: '#00f2fe60', borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0px 0px 40px 0px rgba(0, 242, 254, 0.18)' },
  logo: { width: 116, height: 116, borderRadius: 24 },
  laser: { position: 'absolute', top: -24, left: 0, right: 0, height: 30 },
  laserLine: { height: 2, backgroundColor: '#b9ffff', boxShadow: '0px 0px 12px 3px rgba(0, 242, 254, 0.65)' },
  corner: { position: 'absolute', width: 20, height: 20, borderColor: '#00f2fe', opacity: 0.65 },
  topLeft: { top: 24, left: 24, borderTopWidth: 1, borderLeftWidth: 1, borderTopLeftRadius: 5 },
  bottomRight: { bottom: 24, right: 24, borderBottomWidth: 1, borderRightWidth: 1, borderBottomRightRadius: 5 },
  title: { color: '#f1ffff', fontSize: 38, fontWeight: '700', letterSpacing: -1.5, textShadowColor: '#00f2fe45', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 18 },
  titleCompact: { fontSize: 32 },
  slogan: { color: '#91a8b7', fontSize: 12, letterSpacing: 0.65, marginTop: 10, textAlign: 'center' },
  brandRule: { width: 32, height: 2, backgroundColor: '#10b981', marginTop: 24, borderRadius: 1 },
  footer: { width: '100%', maxWidth: 400, alignItems: 'center', paddingBottom: 12 },
  pill: { width: '100%', borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: '#b3ffff20', backgroundColor: '#16283066', paddingHorizontal: 18, paddingVertical: 20 },
  statusRow: { flexDirection: 'row', gap: 9, alignItems: 'center', minHeight: 32 },
  status: { flex: 1, color: '#c0d6df', fontSize: 11, lineHeight: 17 },
  step: { color: '#66858e', fontSize: 9, letterSpacing: 1 },
  track: { height: 3, borderRadius: 2, overflow: 'hidden', backgroundColor: '#ffffff0d', marginTop: 12 },
  progress: { height: 3, borderRadius: 2, backgroundColor: '#00f2fe', boxShadow: '0px 0px 8px 0px rgba(0, 242, 254, 0.6)' },
  footerLabel: { color: '#506573', fontSize: 8, letterSpacing: 2, marginTop: 20, textAlign: 'center' },
});
