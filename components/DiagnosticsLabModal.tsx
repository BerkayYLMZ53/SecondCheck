import Pressable from './AnimatedPressable';
import { useEffect, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { Modal, PanResponder, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemedStyles } from '../context/ThemeContext';
import type { ThemeColors } from '../context/ThemeContext';
import type { LabResults, LabTestId, TestStatus } from '../types/inspection';
import { LAB_IDS, LAB_LABELS, STATUS_LABELS } from '../utils/inspection';
import { GRID_COLUMNS, GRID_ROWS, GRID_TOTAL, traceGridCells } from '../utils/diagnosticGrid';
import type { GridPoint } from '../utils/diagnosticGrid';
import { useLabSignals } from '../utils/useLabSignals';

const PIXELS = [
  { color: '#000000', name: 'Siyah' }, { color: '#ffffff', name: 'Beyaz' },
  { color: '#ef4444', name: 'Kırmızı' }, { color: '#10b981', name: 'Yeşil' }, { color: '#3b82f6', name: 'Mavi' },
];

function createTouchResponder(onChange: (cells: Set<number>) => void) {
  let touched = new Set<number>();
  let bounds = { x: 0, y: 0, width: 0, height: 0 };
  const previous = new Map<number, GridPoint>();
  const trace = (event: GestureResponderEvent) => {
    const { x, y, width, height } = bounds;
    const touches = event.nativeEvent.touches.length ? event.nativeEvent.touches : [event.nativeEvent];
    const next = new Set(touched);
    for (const touch of touches) {
      const point = { x: touch.pageX - x, y: touch.pageY - y };
      const key = touch.identifier ?? 0;
      traceGridCells(previous.get(key) ?? point, point, width, height).forEach((id) => next.add(id));
      previous.set(key, point);
    }
    if (next.size !== touched.size) { touched = next; onChange(next); }
  };
  return { updateBounds: (x: number, y: number, width: number, height: number) => { bounds = { x, y, width, height }; previous.clear(); }, responder: PanResponder.create({
    onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => { previous.clear(); trace(event); }, onPanResponderMove: trace,
    onPanResponderRelease: () => previous.clear(), onPanResponderTerminate: () => previous.clear(), onPanResponderTerminationRequest: () => false,
  }) };
}

function TouchCanvas({ onFinish }: { onFinish: (count: number) => void }) {
  const [touched, setTouched] = useState<Set<number>>(() => new Set());
  const surface = useRef<ComponentRef<typeof View>>(null);
  const [grid] = useState(() => createTouchResponder(setTouched));
  return <View style={{ flex: 1, gap: 12 }}>
    <Text style={{ color: '#f8fafc', textAlign: 'center' }}>Parmağınızı test alanının bütün köşelerine sürükleyin.</Text>
    <View ref={surface} testID="lab-touch-grid" accessibilityLabel="6 sütun 10 satır canlı dokunmatik test alanı"
      onLayout={() => surface.current?.measureInWindow(grid.updateBounds)}
      style={{ flex: 1, backgroundColor: '#131b2e', minHeight: 200, overflow: 'hidden' }} {...grid.responder.panHandlers}>
      {Array.from({ length: GRID_TOTAL }, (_, index) => <View key={index} pointerEvents="none" testID={`lab-touch-cell-${index}`} style={{ position: 'absolute',
        left: `${index % GRID_COLUMNS * 100 / GRID_COLUMNS}%`, top: `${Math.floor(index / GRID_COLUMNS) * 100 / GRID_ROWS}%`,
        width: `${100 / GRID_COLUMNS}%`, height: `${100 / GRID_ROWS}%`, borderWidth: 1, borderColor: '#475569', backgroundColor: touched.has(index) ? '#10b981' : '#131b2e' }} />)}
    </View>
    <Text style={{ color: '#f8fafc', textAlign: 'center' }} testID="lab-touch-progress">{touched.size} / {GRID_TOTAL} hücre</Text>
    <Pressable accessibilityRole="button" onPress={() => onFinish(touched.size)} style={base.overlayButton}><Text style={base.overlayText}>Izgara turunu bitir</Text></Pressable>
  </View>;
}

export default function DiagnosticsLabModal({ initialResults, onComplete, onClose }: {
  initialResults: LabResults; onComplete: (results: LabResults) => void; onClose: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [results, setResults] = useState<LabResults>(() => Object.fromEntries(LAB_IDS.map((id) => [id, { ...initialResults[id] }])) as LabResults);
  const [mode, setMode] = useState<'menu' | 'pixels' | 'touch'>('menu');
  const [pixel, setPixel] = useState(0);
  const [pixelReady, setPixelReady] = useState(false);
  const [pixelControls, setPixelControls] = useState(true);
  const [touchCount, setTouchCount] = useState<number | null>(null);
  const [vibrationReady, setVibrationReady] = useState(false);
  const [vibrationBusy, setVibrationBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const signals = useLabSignals();
  const setResult = (id: LabTestId, status: TestStatus, note: string) => setResults((current) => ({ ...current, [id]: { status, note, completedAt: new Date().toISOString() } }));
  const close = () => { signals.stop(); onClose(); };
  const commit = () => { signals.stop(); onComplete(results); };
  const confirmation = (id: LabTestId, ready: boolean, note: string) => <View style={styles.row}>
    <Pressable testID={`lab-pass-${id}`} accessibilityRole="button" disabled={!ready} accessibilityState={{ disabled: !ready }} onPress={() => setResult(id, 'pass', note)} style={[styles.button, !ready && styles.disabled]}><Text style={styles.buttonText}>Sağlam</Text></Pressable>
    <Pressable haptic="warning" testID={`lab-fail-${id}`} accessibilityRole="button" disabled={!ready} accessibilityState={{ disabled: !ready }} onPress={() => setResult(id, 'fail', note)} style={[styles.outline, !ready && styles.disabled]}><Text style={styles.text}> {id === 'audio' ? 'Cızırtılı / kesiliyor' : 'Sorun var'}</Text></Pressable>
    <Pressable testID={`lab-skip-${id}`} accessibilityRole="button" onPress={() => setResult(id, 'unsupported', 'Kullanıcı testi tamamlayamadı / bu cihazda desteklenmiyor.')} style={styles.outline}><Text style={styles.text}>Test edilemiyor</Text></Pressable>
  </View>;
  const fullscreen = mode !== 'menu';
  const currentPixel = PIXELS[pixel] ?? PIXELS[0]!;
  return <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={close}>
    <StatusBar hidden={fullscreen} />
    {mode === 'pixels' ? <View style={{ flex: 1, backgroundColor: currentPixel.color }}>
      <Pressable pressScale={1} testID="lab-pixel-surface" accessibilityRole="button" accessibilityLabel={`${currentPixel.name} ekran. Sonraki renge geç.`} style={StyleSheet.absoluteFill}
        onLongPress={() => setPixelControls((value) => !value)}
        onPress={() => { if (pixel < PIXELS.length - 1) setPixel(pixel + 1); else { setPixelReady(true); setMode('menu'); } }} />
      {pixelControls && <View pointerEvents="box-none" style={[base.pixelControls, { top: Math.max(insets.top, 8) }]}>
        <Pressable accessibilityRole="button" onPress={() => setMode('menu')} style={base.overlayButton}><Text style={base.overlayText}>Geri</Text></Pressable>
        <Text pointerEvents="none" style={base.overlayText}>{pixel + 1}/5 · {currentPixel.name} · Dokun: ilerle · Basılı tut: yazıyı gizle</Text>
      </View>}
    </View> : mode === 'touch' ? <View style={[base.touchPage, { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 12) }]}>
      <Pressable accessibilityRole="button" onPress={() => setMode('menu')} style={base.overlayButton}><Text style={base.overlayText}>Menüye dön</Text></Pressable>
      <TouchCanvas onFinish={(count) => { setTouchCount(count); setMode('menu'); }} />
    </View> : <View style={[styles.page, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.row}><Text accessibilityRole="header" style={styles.heading}>Canlı Donanım Laboratuvarı</Text><Pressable accessibilityRole="button" accessibilityLabel="Laboratuvarı kapat" onPress={close} style={styles.outline}><Text style={styles.text}>Kapat</Text></Pressable></View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.caption}>Bu testler uygulamanın açık olduğu cihazda çalışır. Sonuçlar sizin gözleminizdir; başka bir ilandaki telefonu uzaktan ölçmez.</Text>
        <View style={styles.panel}><Text style={styles.title}>1 · Ekran / ölü piksel & iz</Text><Text style={styles.text}>Siyah, beyaz, kırmızı, yeşil ve mavi zeminde sabit leke, gölge, ölü piksel ve ışık sızması arayın. Üstteki bilgi kutusunun örttüğü alanı da kutuyu gizleyerek inceleyebilirsiniz.</Text>
          <Pressable testID="lab-start-pixels" accessibilityRole="button" onPress={() => { signals.stop(); setResult('pixels', 'pending', 'Renk testi yeniden başlatıldı.'); setPixel(0); setPixelControls(true); setPixelReady(false); setMode('pixels'); }} style={styles.button}><Text style={styles.buttonText}>Tam ekran renk testi</Text></Pressable>
          {confirmation('pixels', pixelReady, 'Beş renk görüntülendi; ölü piksel, iz ve sızma kullanıcı tarafından gözlemlendi.')}
        </View>
        <View style={styles.panel}><Text style={styles.title}>2 · Dokunmatik alan</Text><Text style={styles.text}>Izgara test alanının bütün hücrelerini yeşile boyayın. Eksik hücre doğrudan arıza sayılmaz; tekrar deneyin.</Text>
          <Pressable testID="lab-start-touch" accessibilityRole="button" onPress={() => { signals.stop(); setResult('touch', 'pending', 'Izgara testi yeniden başlatıldı.'); setTouchCount(null); setMode('touch'); }} style={styles.button}><Text style={styles.buttonText}>Dokunmatik ızgarayı aç</Text></Pressable>
          <Text style={styles.caption}>{touchCount === null ? 'Henüz çizim yapılmadı.' : `${touchCount}/${GRID_TOTAL} hücreye temas algılandı.`}</Text>
          {confirmation('touch', touchCount === GRID_TOTAL, `${touchCount ?? 0}/${GRID_TOTAL} hücreye temas algılandı.`)}
          {touchCount !== null && touchCount < GRID_TOTAL && <Pressable accessibilityRole="button" onPress={() => setResult('touch', 'fail', `${touchCount}/${GRID_TOTAL} hücre; kullanıcı kör nokta bildirdi.`)} style={styles.outline}><Text style={styles.text}>Tekrar denedim, kör nokta var</Text></Pressable>}
        </View>
        <View style={styles.panel}><Text style={styles.title}>3 · Hoparlör / ahize</Text><Text style={styles.text}>200 Hz ve 2000 Hz düşük seviyeli sinüs tonları sırayla çalar. Tarayıcı üst ahize ve alt hoparlörü ayrı yönlendiremez. Mevcut çıkışı dinleyin; ahizeyi ayrıca bir telefon görüşmesiyle doğrulayın. Sesi kulağınıza yakınken artırmayın.</Text>
          <Pressable testID="lab-start-audio" accessibilityRole="button" disabled={signals.busy} onPress={() => { setResult('audio', 'pending', 'Ses testi başlatıldı.'); void signals.startAudio(); }} style={styles.button}><Text style={styles.buttonText}>{signals.busy ? 'Tonlar çalıyor…' : '200 Hz → 2000 Hz çal'}</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={signals.stop} style={styles.outline}><Text style={styles.text}>Sesi durdur</Text></Pressable>
          {confirmation('audio', signals.audioReady, 'Mevcut ses çıkışı 200/2000 Hz ile dinlendi; üst ahize bağımsız ölçülmedi.')}
        </View>
        <View style={styles.panel}><Text style={styles.title}>4 · Titreşim / haptik</Text><Text style={styles.text}>Üç farklı ritim/şiddette komut gönderilir. Sistem ayarları ve tarayıcı titreşimi engelleyebilir; tepki olmaması tek başına donanım arızası değildir.</Text>
          <Pressable testID="lab-start-vibration" accessibilityRole="button" disabled={vibrationBusy} accessibilityState={{ disabled: vibrationBusy, busy: vibrationBusy }} onPress={() => {
            setVibrationBusy(true); setVibrationReady(false); setResult('vibration', 'pending', 'Titreşim testi başlatıldı.');
            void signals.vibrate().then((supported) => {
              if (!mounted.current || supported === null) return;
              setVibrationReady(supported);
              if (!supported) setResult('vibration', 'unsupported', 'Titreşim API’si kullanılamadı.');
            }).finally(() => { if (mounted.current) setVibrationBusy(false); });
          }} style={styles.button}><Text style={styles.buttonText}>{vibrationBusy ? 'Titreşim gönderiliyor…' : 'Titreşimi dene'}</Text></Pressable>
          {confirmation('vibration', vibrationReady, 'Titreşim komutu gönderildi; fiziksel tepki kullanıcı tarafından değerlendirildi.')}
        </View>
        <Text style={styles.caption} accessibilityLiveRegion="polite">{signals.message}</Text>
        {LAB_IDS.map((id) => <Text key={id} style={styles.text} testID={`lab-result-${id}`}>{LAB_LABELS[id]}: {STATUS_LABELS[results[id].status]}</Text>)}
        <Pressable testID="lab-apply-results" accessibilityRole="button" onPress={commit} style={styles.button}><Text style={styles.buttonText}>Sonuçları ekspertiz listesine aktar</Text></Pressable>
        <Text style={styles.caption}>Yalnızca kaydettiğiniz test sonuçları aktarılır. Kontrol edilmemiş Face ID, True Tone veya sıvı teması gibi maddeler otomatik onaylanmaz.</Text>
      </ScrollView>
    </View>}
  </Modal>;
}

const base = StyleSheet.create({
  touchPage: { flex: 1, paddingHorizontal: 12, gap: 12, backgroundColor: '#0b0f19' },
  pixelControls: { position: 'absolute', left: 10, right: 10, flexDirection: 'row', gap: 8, alignItems: 'center' },
  overlayButton: { padding: 12, minHeight: 44, backgroundColor: '#0f172ae6', borderRadius: 10, alignItems: 'center' },
  overlayText: { color: '#f8fafc', fontSize: 12, backgroundColor: '#0f172ae6', padding: 4 },
});
const createStyles = (c: ThemeColors) => StyleSheet.create({
  page: { flex: 1, minHeight: 0, paddingHorizontal: 16, gap: 14, backgroundColor: c.bg },
  content: { gap: 16, paddingBottom: 24 }, panel: { gap: 12, padding: 16, borderRadius: 18, backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.cardBorder },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }, heading: { color: c.textPrimary, fontSize: 21, fontWeight: '800', flex: 1, minWidth: 180 },
  title: { color: c.textPrimary, fontSize: 17, fontWeight: '700' }, text: { color: c.textPrimary, fontSize: 13, lineHeight: 21, flexShrink: 1 }, caption: { color: c.textSecondary, fontSize: 12, lineHeight: 20 },
  button: { backgroundColor: c.accent, padding: 13, borderRadius: 12, minHeight: 46, alignItems: 'center' }, buttonText: { color: c.onAccent, fontWeight: '700', fontSize: 13 },
  outline: { backgroundColor: c.inset, borderWidth: 1, borderColor: c.cardBorder, padding: 12, borderRadius: 12, minHeight: 46, alignItems: 'center' }, disabled: { opacity: 0.4 },
});
