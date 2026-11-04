import { forwardRef, memo, useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { CircleProps } from 'react-native-svg';
import type { TrustAssessment } from '../types/trust';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import type { ThemeColors } from '../context/ThemeContext';
import { useReducedMotion } from '../utils/useReducedMotion';
import HolographicCard from './HolographicCard';

// Animated injects a native layout flag that SVG forwards to the web DOM.
const WebCircle = forwardRef<Circle, CircleProps & { collapsable?: boolean }>(function WebCircle({ collapsable, ...props }, ref) {
  void collapsable;
  return <Circle ref={ref} {...props} />;
});
const AnimatedCircle = Animated.createAnimatedComponent(Platform.OS === 'web' ? WebCircle : Circle);
const SIZE = 196;
const RADIUS = 80;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default memo(function TrustScoreGauge({ assessment, active = true }: { assessment: TrustAssessment; active?: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const reduced = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!active) return;
    progress.stopAnimation();
    if (reduced) { progress.setValue(assessment.score); return; }
    const animation = Animated.spring(progress, { toValue: assessment.score, useNativeDriver: false, speed: 11, bounciness: 5 });
    animation.start();
    return () => animation.stop();
  }, [assessment.score, progress, reduced, active]);
  const bandText = assessment.grade === 'A+' ? colors.successText : assessment.grade === 'B' ? colors.amber : colors.dangerText;
  return (
    <HolographicCard active={active}><View style={styles.panel} testID="trust-score-gauge">
      <Text style={styles.eyebrow}>GÜVENİLİRLİK & RİSK ÖZETİ</Text>
      <View style={styles.ring} accessibilityRole="progressbar" accessibilityLabel="İlan güven skoru"
        accessibilityValue={{ min: 0, max: 100, now: assessment.score, text: `${assessment.score} / 100, ${assessment.label}` }}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} {...(Platform.OS === 'web' ? { 'aria-hidden': true } : { accessible: false })}>
          <Circle cx={98} cy={98} r={RADIUS} stroke={colors.track} strokeWidth={12} fill="none" />
          <AnimatedCircle cx={98} cy={98} r={RADIUS} stroke={assessment.color} strokeWidth={12} fill="none"
            strokeLinecap="round" transform="rotate(-90 98 98)" strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={progress.interpolate({ inputRange: [0, 100], outputRange: [CIRCUMFERENCE, 0], extrapolate: 'clamp' })} />
        </Svg>
        <View style={styles.center} pointerEvents="none">
          <Text style={styles.score} testID="trust-score-value">{assessment.available ? assessment.score : '—'}</Text>
          <Text style={[styles.grade, { color: bandText }]}>{assessment.available ? `${assessment.grade} · 100 üzerinden` : 'Veri yetersiz'}</Text>
        </View>
      </View>
      <Text style={[styles.verdict, { color: bandText }]} testID="trust-score-verdict">{assessment.label}</Text>
      <View style={styles.chips}>
        {assessment.adjustments.map((item) => <Text key={item.id} style={[styles.chip, { color: item.points < 0 ? colors.warningText : colors.successText,
          backgroundColor: item.points < 0 ? colors.warningBg : colors.successBg }]}>{item.points > 0 ? '+' : ''}{item.points} {item.label}</Text>)}
      </View>
      <Text style={styles.note}>Başlangıç 70 puan. İlan beyanı ve işaretli kontrollerden hesaplanan ön değerlendirmedir; ölçülmüş arıza olasılığı veya teknik garanti değildir.</Text>
      {assessment.provisional && <Text style={styles.note}>A+ için bütün kritik kontroller ve pil/parça bilgileri tamamlanmalıdır.</Text>}
    </View></HolographicCard>
  );
});

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  panel: { alignItems: 'center', gap: 12, paddingVertical: 18, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.inset },
  eyebrow: { color: colors.cyan, fontSize: 10, fontWeight: '800', letterSpacing: 1.6, lineHeight: 18, textAlign: 'center' },
  ring: { width: SIZE, height: SIZE },
  center: { position: 'absolute', inset: 0, justifyContent: 'center', alignItems: 'center' },
  score: { color: colors.textPrimary, fontSize: 56, lineHeight: 65, fontWeight: '800', fontVariant: ['tabular-nums'] },
  grade: { fontSize: 12, lineHeight: 19, fontWeight: '700' },
  verdict: { fontSize: 15, lineHeight: 23, fontWeight: '800', textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7 },
  chip: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, fontSize: 11, lineHeight: 17, maxWidth: '100%', flexShrink: 1 },
  note: { color: colors.textSecondary, fontSize: 11, lineHeight: 18, textAlign: 'center' },
});
