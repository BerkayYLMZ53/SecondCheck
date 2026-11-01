import { useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Grid2X2,
  Mic,
  Monitor,
  RotateCcw,
  Square,
  Volume2,
  X,
} from 'lucide-react-native';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import type { ThemeColors } from '../context/ThemeContext';
import {
  GRID_COLUMNS,
  GRID_ROWS,
  GRID_TOTAL,
  traceGridCells,
} from '../utils/diagnosticGrid';
import type { GridPoint } from '../utils/diagnosticGrid';
import { useDiagnosticAudio } from '../utils/useDiagnosticAudio';

type Mode = 'menu' | 'pixels' | 'touch';
const PIXEL_COLORS = [
  { name: 'Kırmızı', value: '#FF0000' },
  { name: 'Yeşil', value: '#00FF00' },
  { name: 'Mavi', value: '#0000FF' },
  { name: 'Beyaz', value: '#FFFFFF' },
  { name: 'Siyah', value: '#000000' },
] as const;

function createGridResponder(onCells: (cells: number[]) => void) {
  let bounds = { x: 0, y: 0, width: 0, height: 0 };
  const previous = new Map<number, GridPoint>();
  const trace = (event: GestureResponderEvent) => {
    const { x, y, width, height } = bounds;
    const additions: number[] = [];
    for (const touch of event.nativeEvent.touches) {
      const point = { x: touch.pageX - x, y: touch.pageY - y };
      additions.push(
        ...traceGridCells(
          previous.get(touch.identifier) ?? point,
          point,
          width,
          height,
        ),
      );
      previous.set(touch.identifier, point);
    }
    onCells(additions);
  };
  return {
    updateBounds: (x: number, y: number, width: number, height: number) => {
      bounds = { x, y, width, height };
    },
    reset: () => previous.clear(),
    responder: PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        previous.clear();
        trace(event);
      },
      onPanResponderMove: trace,
      onPanResponderRelease: () => previous.clear(),
      onPanResponderTerminate: () => previous.clear(),
      onPanResponderTerminationRequest: () => false,
    }),
  };
}

function TouchGrid() {
  const [touched, setTouched] = useState<Set<number>>(() => new Set());
  const surface = useRef<ComponentRef<typeof View>>(null);
  const [grid] = useState(() =>
    createGridResponder((additions) => {
      if (additions.length)
        setTouched((current) => {
          if (additions.every((cell) => current.has(cell))) return current;
          return new Set([...current, ...additions]);
        });
    }),
  );
  const insets = useSafeAreaInsets();
  const measure = () => surface.current?.measureInWindow(grid.updateBounds);
  return (
    <View style={stylesBase.full}>
      <View
        ref={surface}
        testID="touch-grid-surface"
        onLayout={measure}
        accessibilityLabel="6 sütun 10 satır dokunmatik test alanı; parmağınızı tüm hücrelerde gezdirin"
        style={stylesBase.grid}
        {...grid.responder.panHandlers}
      >
        {Array.from({ length: GRID_TOTAL }, (_, index) => (
          <View
            key={index}
            pointerEvents="none"
            testID={`touch-cell-${index}`}
            style={[
              stylesBase.cell,
              {
                left: `${((index % GRID_COLUMNS) * 100) / GRID_COLUMNS}%`,
                top: `${(Math.floor(index / GRID_COLUMNS) * 100) / GRID_ROWS}%`,
                backgroundColor: touched.has(index) ? '#10B981' : '#131B2E',
              },
            ]}
          />
        ))}
      </View>
      <View
        pointerEvents="box-none"
        style={[stylesBase.gridFooter, { bottom: Math.max(insets.bottom, 12) }]}
      >
        <Text
          accessibilityLiveRegion="polite"
          style={stylesBase.overlayText}
          testID="touch-progress"
        >
          {touched.size} / {GRID_TOTAL} hücre
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dokunmatik testi sıfırla"
          onPress={() => {
            grid.reset();
            setTouched(new Set());
          }}
          style={({ pressed }) => [
            stylesBase.overlayButton,
            pressed && stylesBase.pressed,
          ]}
        >
          <RotateCcw color="#FFFFFF" size={16} />
          <Text style={stylesBase.overlayText}>Sıfırla</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function HardwareDiagnosticsModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('menu');
  const [colorIndex, setColorIndex] = useState(0);
  const audio = useDiagnosticAudio();
  const pixel = PIXEL_COLORS[colorIndex] ?? PIXEL_COLORS[0];
  const busy = audio.phase !== 'idle';
  const close = () => {
    audio.stop();
    onClose();
  };
  const back = () => {
    if (mode === 'menu') close();
    else setMode('menu');
  };
  const openVisual = (next: Mode) => {
    audio.stop();
    setColorIndex(0);
    setMode(next);
  };
  return (
    <Modal
      visible
      transparent={mode === 'menu'}
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={back}
      accessibilityLabel="Donanım tanılama araçları"
    >
      <StatusBar hidden={mode !== 'menu'} />
      {mode === 'menu' ? (
        <View
          style={[
            styles.overlay,
            {
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom, 16),
              paddingLeft: Math.max(insets.left, 12),
              paddingRight: Math.max(insets.right, 12),
            },
          ]}
        >
          <View style={styles.panel} accessibilityViewIsModal>
            <View style={styles.header}>
              <View style={styles.flex}>
                <Text style={styles.title}>Donanımı Yerinde Test Et</Text>
                <Text style={styles.body}>İnteraktif tanılama araçları</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tanılama araçlarını kapat"
                onPress={close}
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && stylesBase.pressed,
                ]}
              >
                <X color={colors.text} size={22} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.scroll}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.content}
            >
              <Text style={styles.body}>
                Testler uygulamanın açık olduğu cihazda çalışır. Sonuçları gözle
                ve dinleyerek değerlendirin.
              </Text>
              <View style={styles.card}>
                <View style={styles.row}>
                  <Monitor color={colors.cyan} size={22} />
                  <Text style={styles.heading}>Ölü Piksel Testi</Text>
                </View>
                <Text style={styles.body}>
                  Kırmızı, yeşil, mavi, beyaz ve siyah ekranlarda sabit kalan
                  veya sönük pikselleri arayın. Her dokunuş rengi değiştirir.
                </Text>
                <Pressable
                  testID="start-pixel-test"
                  accessibilityRole="button"
                  onPress={() => openVisual('pixels')}
                  style={({ pressed }) => [
                    styles.button,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.buttonText}>Piksel Testini Aç</Text>
                </Pressable>
              </View>
              <View style={styles.card}>
                <View style={styles.row}>
                  <Grid2X2 color={colors.cyan} size={22} />
                  <Text style={styles.heading}>Dokunmatik Grid Testi</Text>
                </View>
                <Text style={styles.body}>
                  6 × 10 hücrenin üzerinde parmağınızı gezdirin. Dokunulan
                  alanlar yeşile döner. Boş kalan bölgeleri yeniden deneyin.
                </Text>
                <Pressable
                  testID="start-touch-test"
                  accessibilityRole="button"
                  onPress={() => openVisual('touch')}
                  style={({ pressed }) => [
                    styles.button,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.buttonText}>Dokunmatik Testini Aç</Text>
                </Pressable>
              </View>
              <View style={styles.card}>
                <View style={styles.row}>
                  <Volume2 color={colors.cyan} size={22} />
                  <Text style={styles.heading}>
                    Hoparlör / Ahize Frekans Testi
                  </Text>
                </View>
                <Text style={styles.body}>
                  Sesi düşük seviyede başlatın. 80 Hz–8 kHz taramasında cızırtı
                  veya titreşim arayın. Ses seçili çıkıştan gelir; ahizeye
                  yönlendirme cihaz ve tarayıcıya bağlıdır.
                </Text>
                <Pressable
                  testID="start-speaker-test"
                  accessibilityRole="button"
                  disabled={busy}
                  accessibilityState={{ disabled: busy }}
                  onPress={() => void audio.startSweep()}
                  style={({ pressed }) => [
                    styles.button,
                    pressed && styles.pressed,
                    busy && stylesBase.disabled,
                  ]}
                >
                  <Text style={styles.buttonText}>
                    6 Saniyelik Ses Taraması
                  </Text>
                </Pressable>
              </View>
              <View style={styles.card}>
                <View style={styles.row}>
                  <Mic color={colors.cyan} size={22} />
                  <Text style={styles.heading}>Mikrofon Yankı Kontrolü</Text>
                </View>
                <Text style={styles.body}>
                  İzin verdikten sonra 3 saniye konuşun; kaydınız hemen
                  oynatılır. Kayıt cihazınızda işlenir, sunucuya gönderilmez.
                </Text>
                <Pressable
                  testID="start-microphone-test"
                  accessibilityRole="button"
                  disabled={busy}
                  accessibilityState={{ disabled: busy }}
                  onPress={() => void audio.startEcho()}
                  style={({ pressed }) => [
                    styles.button,
                    pressed && styles.pressed,
                    busy && stylesBase.disabled,
                  ]}
                >
                  <Text style={styles.buttonText}>
                    3 Saniye Kaydet ve Dinle
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
            <View style={styles.status}>
              <Text
                testID="diagnostic-audio-status"
                accessibilityLiveRegion="polite"
                style={styles.body}
              >
                {audio.message}
                {audio.phase === 'recording' ? ` (${audio.seconds} sn)` : ''}
              </Text>
              {busy && (
                <Pressable
                  accessibilityRole="button"
                  onPress={audio.stop}
                  style={({ pressed }) => [
                    styles.button,
                    pressed && styles.pressed,
                  ]}
                >
                  <Square color={colors.onAccent} size={16} />
                  <Text style={styles.buttonText}>Testi Durdur</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      ) : (
        <View style={stylesBase.full}>
          {mode === 'pixels' ? (
            <Pressable
              testID="pixel-test-surface"
              accessibilityRole="button"
              accessibilityLabel={`${pixel.name} ekran. Sonraki renk için dokunun.`}
              onPress={() =>
                setColorIndex((current) => (current + 1) % PIXEL_COLORS.length)
              }
              style={[stylesBase.full, { backgroundColor: pixel.value }]}
            />
          ) : (
            <TouchGrid />
          )}
          <View
            pointerEvents="box-none"
            style={[
              stylesBase.visualHeader,
              {
                top: Math.max(insets.top, 12),
                left: Math.max(insets.left, 12),
                right: Math.max(insets.right, 12),
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Testten çık"
              onPress={back}
              style={({ pressed }) => [
                stylesBase.overlayButton,
                pressed && stylesBase.pressed,
              ]}
            >
              <ArrowLeft size={18} color="#FFFFFF" />
              <Text style={stylesBase.overlayText}>Testten Çık</Text>
            </Pressable>
            <Text pointerEvents="none" style={stylesBase.overlayLabel}>
              {mode === 'pixels'
                ? `${colorIndex + 1}/5 • ${pixel.name} • Dokun: sonraki renk`
                : '6 × 10 • Parmağınızı gezdirin'}
            </Text>
          </View>
        </View>
      )}
    </Modal>
  );
}

const stylesBase = StyleSheet.create({
  full: { flex: 1, width: '100%', backgroundColor: '#0B0F19' },
  grid: { flex: 1, width: '100%', overflow: 'hidden' },
  cell: {
    position: 'absolute',
    width: `${100 / GRID_COLUMNS}%`,
    height: `${100 / GRID_ROWS}%`,
    borderWidth: 1,
    borderColor: '#334155',
  },
  visualHeader: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  overlayButton: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#0B0F19DD',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overlayText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  overlayLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#0B0F19DD',
    flexShrink: 1,
  },
  gridFooter: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#0B0F19DD',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    gap: 12,
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
});
const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      paddingHorizontal: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    panel: {
      minWidth: 0,
      minHeight: 0,
      width: '100%',
      height: '100%',
      maxWidth: 680,
      maxHeight: 900,
      flexShrink: 1,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 20,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 18,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    flex: { flex: 1, minWidth: 0, gap: 4 },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      flexShrink: 1,
    },
    body: { fontSize: 14, lineHeight: 21, color: colors.muted, flexShrink: 1 },
    heading: { color: colors.text, fontSize: 16, fontWeight: '700', flex: 1 },
    iconButton: {
      minHeight: 44,
      minWidth: 44,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 10,
      borderRadius: 12,
      backgroundColor: colors.inset,
    },
    scroll: { flex: 1, minHeight: 0 },
    content: { flexGrow: 1, padding: 16, paddingBottom: 40, gap: 14 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    card: {
      gap: 12,
      padding: 16,
      borderRadius: 14,
      backgroundColor: colors.inset,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    button: {
      minHeight: 46,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.accent,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    },
    buttonText: {
      color: colors.onAccent,
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
      flexShrink: 1,
    },
    pressed: { backgroundColor: colors.accentPressed },
    status: {
      gap: 10,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
  });
