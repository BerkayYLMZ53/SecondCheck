import Pressable from './AnimatedPressable';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { RotateCcw, Volume2, VolumeX, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import type { ThemeColors } from '../context/ThemeContext';
import type { DeviceItem } from '../types/catalog';
import type { FieldInspectionReport, FieldStepResult } from '../types/fieldInspection';
import { buildFieldInspectionReport, getFieldTestSteps } from '../utils/fieldInspection';
import { useFieldSpeech } from '../utils/useFieldSpeech';
import { playHaptic } from '../utils/haptics';

export default function VoiceFieldAssistantModal({ device, onComplete, onClose }: {
  device: DeviceItem; onComplete: (report: FieldInspectionReport) => void; onClose: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const compact = height < 600;
  const steps = useMemo(() => getFieldTestSteps(device), [device]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<FieldStepResult[]>([]);
  const [muted, setMuted] = useState(false);
  const [locked, setLocked] = useState(false);
  const lock = useRef(false);
  const finished = useRef(false);
  const unlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speech = useFieldSpeech();
  const { speak, cancel } = speech;
  const current = steps[index]!;
  const silent = muted || speech.status === 'silent';
  const progress = Math.floor((index + 1) / steps.length * 100);
  const spokenText = current.spoken;
  useEffect(() => {
    speak(steps[0]!.spoken);
    return () => cancel();
  }, [steps, speak, cancel]);
  useEffect(() => {
    const timer = unlockTimer;
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);
  const close = () => { finished.current = true; cancel(); onClose(); };
  const replay = () => { setMuted(false); speak(spokenText); };
  const answer = (status: 'pass' | 'fail') => {
    if (lock.current || finished.current) return;
    lock.current = true; setLocked(true);
    void playHaptic('light');
    const completed = [...answers, { ...current, status, answeredAt: new Date().toISOString() }];
    if (index === steps.length - 1) {
      finished.current = true; cancel(); onComplete(buildFieldInspectionReport(completed));
      return;
    }
    setAnswers(completed); setIndex(index + 1);
    if (!silent) speak(steps[index + 1]!.spoken); else cancel();
    unlockTimer.current = setTimeout(() => { lock.current = false; setLocked(false); }, 350);
  };

  return <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={close}>
    <View testID="voice-field-modal" style={[styles.page, compact && { gap: 6 }, { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 14) }]}>
      <View style={styles.header}>
        <View style={styles.grow}><Text style={styles.eyebrow}>SESLİ SAHA ASİSTANI</Text>{!compact && <Text style={styles.device} numberOfLines={1}>{device.model.toLowerCase().startsWith(device.brand.toLowerCase()) ? device.model : `${device.brand} ${device.model}`}</Text>}</View>
        <Pressable accessibilityRole="button" accessibilityLabel="Sesli saha testini kapat" onPress={close} style={styles.iconButton}><X size={23} color={colors.textPrimary} /></Pressable>
      </View>
      <View style={styles.toolbar}>
        <Pressable testID="field-mute" accessibilityRole="button" accessibilityLabel={silent ? 'Sesi Aç' : 'Sesi Kapat'} onPress={() => { if (silent) replay(); else { setMuted(true); cancel(); } }} style={styles.toolButton}>
          {silent ? <VolumeX size={20} color={colors.cyan} /> : <Volume2 size={20} color={colors.cyan} />}<Text style={styles.toolText}>{silent ? 'Sesi Aç' : 'Sesi Kapat'}</Text>
        </Pressable>
        <Pressable testID="field-replay" accessibilityRole="button" accessibilityLabel="Tekrar Dinle" onPress={replay} style={styles.toolButton}><RotateCcw size={19} color={colors.cyan} /><Text style={styles.toolText}>Tekrar Dinle</Text></Pressable>
      </View>
      <Text numberOfLines={compact ? 1 : undefined} style={styles.caption} accessibilityLiveRegion="polite" testID="field-speech-status">{muted ? 'Ses kapalı. Büyük butonlarla devam edebilirsiniz.' : speech.message}</Text>
      <View style={styles.stepRow}><Text testID="field-step-position" style={styles.stepText}>Adım {index + 1} / {steps.length}</Text><Text style={styles.stepText}>%{progress}</Text></View>
      <View style={styles.track} accessibilityRole="progressbar" accessibilityLabel="Sesli saha testi ilerlemesi" accessibilityValue={{ min: 0, max: 100, now: progress }}><View style={[styles.fill, { width: `${progress}%` }]} /></View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.instructionPanel}>
        <Text accessibilityRole="header" testID="field-step-title" style={styles.title}>{current.title}</Text>
        <Text testID="field-instruction" style={[styles.instruction, { fontSize: Math.max(22, Math.min(30, width / 16)), lineHeight: Math.max(31, Math.min(40, width / 12)) }]}>{current.instruction}</Text>
        <Text style={styles.caption}>Kontrol sonucunu dokunarak seçin. Bu mod sesli komut dinlemez ve mikrofon izni istemez.</Text>
      </ScrollView>
      <View style={styles.actions}>
        <Pressable haptic="warning" testID="field-fail" accessibilityRole="button" accessibilityLabel="Sorun Var / Kaldı" disabled={locked} accessibilityState={{ disabled: locked }} onPress={() => answer('fail')}
          style={({ pressed }) => [styles.answer, styles.fail, { minHeight: compact ? 100 : Math.max(120, Math.min(210, height * 0.24)) }, pressed && styles.pressed]}>
          <Text style={styles.answerIcon}>✕</Text><Text style={styles.answerText}>Sorun Var</Text><Text style={styles.answerSub}>Kaldı</Text>
        </Pressable>
        <Pressable testID="field-pass" accessibilityRole="button" accessibilityLabel="Sorunsuz / Geçti" disabled={locked} accessibilityState={{ disabled: locked }} onPress={() => answer('pass')}
          style={({ pressed }) => [styles.answer, styles.pass, { minHeight: compact ? 100 : Math.max(120, Math.min(210, height * 0.24)) }, pressed && styles.pressed]}>
          <Text style={styles.answerIcon}>✓</Text><Text style={styles.answerText}>Sorunsuz</Text><Text style={styles.answerSub}>Geçti</Text>
        </Pressable>
      </View>
      {!compact && <Text style={styles.footer}>{answers.length}/6 sonuç kaydedildi · Altıncı sonuçla otomatik aktarılır. Erken kapatırsanız bu tur aktarılmaz.</Text>}
    </View>
  </Modal>;
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  page: { flex: 1, minHeight: 0, backgroundColor: c.bg, paddingHorizontal: 16, gap: 12 }, header: { flexDirection: 'row', alignItems: 'center', gap: 10 }, grow: { flex: 1, minWidth: 0 }, eyebrow: { color: c.cyan, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 }, device: { color: c.textSecondary, fontSize: 12, lineHeight: 20 },
  iconButton: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: c.chipBg }, toolbar: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' }, toolButton: { flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 46, padding: 12, backgroundColor: c.accentSoft, borderRadius: 14 }, toolText: { color: c.cyan, fontSize: 13, fontWeight: '700' },
  caption: { color: c.textSecondary, fontSize: 12, lineHeight: 19 }, stepRow: { flexDirection: 'row', justifyContent: 'space-between' }, stepText: { color: c.textSecondary, fontSize: 13, fontWeight: '700' }, track: { height: 7, backgroundColor: c.track, borderRadius: 5 }, fill: { height: '100%', backgroundColor: c.accent, borderRadius: 5 },
  scroll: { flex: 1, minHeight: 0 }, instructionPanel: { flexGrow: 1, justifyContent: 'center', paddingVertical: 14, gap: 18 }, title: { color: c.cyan, fontSize: 19, lineHeight: 26, fontWeight: '800' }, instruction: { color: c.textPrimary, fontWeight: '600' }, actions: { flexDirection: 'row', gap: 12 },
  answer: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 26, gap: 7 }, fail: { backgroundColor: '#b91c1c' }, pass: { backgroundColor: '#047857' }, answerIcon: { color: '#ffffff', fontSize: 42, fontWeight: '800' }, answerText: { color: '#ffffff', fontSize: 19, lineHeight: 25, fontWeight: '800', textAlign: 'center' }, answerSub: { color: '#ffffff', fontSize: 15, fontWeight: '600' }, pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] }, footer: { color: c.textSecondary, fontSize: 10, lineHeight: 16, textAlign: 'center' },
});
