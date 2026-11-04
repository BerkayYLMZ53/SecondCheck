import Pressable from './AnimatedPressable';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Image, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Camera, ScanLine, Upload, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VisualScannerCamera from './VisualScannerCamera';
import type { ChassisCondition, CosmeticCondition, ScannerCameraHandle, VisualEvidencePhoto, VisualInspectionResult, VisualPhotoTarget } from '../types/visualInspection';
import { buildVisualInspection, VISUAL_CONDITIONS, visualScoreLabel } from '../utils/visualInspection';
import { prepareScannerPhoto } from '../utils/scannerPhoto';

type Step = 1 | 2 | 3;
const FALLBACK = 'Kamera açılamadı, kılavuz fotoğrafları yükleyerek devam edebilirsiniz.';

function RulerControl({ label, value, min, max, step = 5, onChange, suffix = '%' }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void; suffix?: string;
}) {
  return <View style={styles.rulerControl}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} azalt`} disabled={value <= min} onPress={() => onChange(Math.max(min, value - step))} style={styles.smallButton}><Text style={styles.text}>−</Text></Pressable>
    <Text style={styles.caption}>{label} {value}{suffix}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} artır`} disabled={value >= max} onPress={() => onChange(Math.min(max, value + step))} style={styles.smallButton}><Text style={styles.text}>+</Text></Pressable>
  </View>;
}

export default function VisualDefectScannerModal({ deviceName, onComplete, onClose }: {
  deviceName: string; onComplete: (result: VisualInspectionResult) => void; onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>(1);
  const [chassis, setChassis] = useState<ChassisCondition | null>(null);
  const [cosmetic, setCosmetic] = useState<CosmeticCondition | null>(null);
  const [photos, setPhotos] = useState<Partial<Record<VisualPhotoTarget, VisualEvidencePhoto>>>({});
  const [widthPercent, setWidthPercent] = useState(80);
  const [heightPercent, setHeightPercent] = useState(32);
  const [angle, setAngle] = useState(0);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [foreground, setForeground] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const camera = useRef<ScannerCameraHandle>(null);
  const mounted = useRef(true);
  const epoch = useRef(0);
  const operation = useRef(false);
  const target: VisualPhotoTarget = step === 1 ? 'chassis' : 'corners';
  const currentPhoto = photos[target];
  const onCameraReady = useCallback(() => { setCameraReady(true); setCameraError(''); }, []);
  const onCameraError = useCallback((message: string) => { setCameraReady(false); setCameraEnabled(false); setCameraError(`${FALLBACK} ${message}`); }, []);
  useEffect(() => {
    if (!cameraEnabled || cameraReady || !foreground) return;
    const timer = setTimeout(() => onCameraError('Kamera zamanında yanıt vermedi. İzin durumunu kontrol edip yeniden deneyin.'), 18000);
    return () => clearTimeout(timer);
  }, [cameraEnabled, cameraReady, foreground, onCameraError]);
  useEffect(() => {
    mounted.current = true;
    const generation = epoch;
    const update = (active: boolean) => {
      setForeground(active);
      if (!active) { setCameraReady(false); setCameraEnabled(false); }
    };
    const subscription = AppState.addEventListener('change', (state) => { if (state !== 'inactive') update(state === 'active'); });
    const visibility = () => update(!document.hidden);
    if (Platform.OS === 'web') document.addEventListener('visibilitychange', visibility);
    return () => { mounted.current = false; generation.current++; subscription.remove(); if (Platform.OS === 'web') document.removeEventListener('visibilitychange', visibility); };
  }, []);
  const close = () => { epoch.current++; setCameraEnabled(false); onClose(); };

  const storePhoto = async (raw: { uri: string; width: number; height: number }, source: 'camera' | 'upload', photoTarget: VisualPhotoTarget, token: number) => {
    const photo = await prepareScannerPhoto(raw, source);
    if (!mounted.current || token !== epoch.current) return;
    setPhotos((previous) => ({ ...previous, [photoTarget]: photo }));
    if (photoTarget === 'chassis') setChassis(null); else setCosmetic(null);
    setCameraEnabled(false); setCameraReady(false);
  };
  const capture = async () => {
    if (!cameraReady || !camera.current || operation.current) return;
    operation.current = true; setBusy(true); setError(''); const token = ++epoch.current;
    try { await storePhoto(await camera.current.capture(), 'camera', target, token); }
    catch (reason) { if (mounted.current && token === epoch.current) setError(reason instanceof Error ? reason.message : 'Fotoğraf çekilemedi.'); }
    finally { operation.current = false; if (mounted.current) setBusy(false); }
  };
  const upload = async () => {
    if (operation.current) return;
    operation.current = true; setBusy(true); setError(''); const token = ++epoch.current;
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.8, exif: false, selectionLimit: 1 });
      if (picked.canceled || !picked.assets[0] || !mounted.current || token !== epoch.current) return;
      const asset = picked.assets[0];
      if (asset.fileSize && asset.fileSize > 20_000_000) throw new Error('En fazla 20 MB fotoğraf seçin.');
      await storePhoto(asset, 'upload', target, token);
    } catch (reason) { if (mounted.current && token === epoch.current) setError(reason instanceof Error ? reason.message : 'Fotoğraf seçilemedi.'); }
    finally { operation.current = false; if (mounted.current) setBusy(false); }
  };
  const next = () => {
    if (step === 1 && photos.chassis && chassis) { setStep(2); setHeightPercent(70); setWidthPercent(58); setAngle(0); setCameraEnabled(false); setCameraReady(false); setError(''); }
    else if (step === 2 && photos.corners && cosmetic) { setStep(3); setCameraEnabled(false); setCameraReady(false); }
  };
  const summary = chassis && cosmetic && photos.chassis && photos.corners ? buildVisualInspection(chassis, cosmetic,
    { chassis: photos.chassis, corners: photos.corners }, { angle, widthPercent, heightPercent }) : null;
  const restartCamera = () => { setCameraReady(false); setCameraError(''); setError(''); setCameraEnabled(true); };
  const canNext = step === 1 ? !!photos.chassis && !!chassis : !!photos.corners && !!cosmetic;

  return <Modal visible presentationStyle="fullScreen" animationType="fade" onRequestClose={close}>
    <View style={[styles.page, { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 12) }]} testID="visual-defect-scanner">
      <View style={styles.header}><ScanLine size={25} color="#67e8f9" /><View style={styles.grow}><Text accessibilityRole="header" style={styles.title}>Şasi & Kasa Dedektifi</Text><Text numberOfLines={1} style={styles.caption}>{deviceName}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Kasa taramasını kapat" onPress={close} style={styles.smallButton}><X size={21} color="#f8fafc" /></Pressable></View>
      <View accessibilityRole="progressbar" accessibilityLabel="Görsel inceleme adımı" accessibilityValue={{ min: 1, max: 3, now: step }} style={styles.progress}><View style={[styles.progressFill, { width: `${step / 3 * 100}%` }]} /></View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{step === 1 ? '1 · Şasi düzlük kontrolü' : step === 2 ? '2 · Köşe darbe & çizik taraması' : '3 · Kozmetik kondisyon özeti'}</Text>
        <Text style={styles.caption}>Optik kılavuzla kullanıcı değerlendirmesi. Otomatik AI hasar tespiti veya hassas açı ölçümü yapılmaz. İkinci bir cihazın kamerasıyla incelenen telefonu görüntüleyin.</Text>
        {step !== 3 ? <>
          {cameraEnabled && !cameraReady && <Text style={styles.caption} accessibilityLiveRegion="polite">Kamera izni / görüntüsü bekleniyor… Fotoğraf yükleyerek de devam edebilirsiniz.</Text>}
          <View style={styles.preview} testID="visual-camera-preview">
            {cameraEnabled && foreground ? <VisualScannerCamera ref={camera} onReady={onCameraReady} onError={onCameraError} />
              : currentPhoto ? <Image source={{ uri: currentPhoto.dataUri }} accessibilityLabel={step === 1 ? 'Şasi inceleme fotoğrafı' : 'Köşe inceleme fotoğrafı'} style={StyleSheet.absoluteFill} resizeMode="contain" />
                : <View style={styles.empty}><Camera size={40} color="#67e8f9" /><Text style={styles.caption}>{cameraError ? 'Kamera kullanılamıyor' : foreground ? 'Kamera hazır değil / duraklatıldı' : 'Kamera arka planda durduruldu'}</Text></View>}
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
              <View style={[styles.guide, { width: `${widthPercent}%`, height: `${heightPercent}%`, transform: [{ rotate: `${angle}deg` }] }]}>
                <View style={styles.crossHorizontal} /><View style={styles.crossVertical} />
                {['tl', 'tr', 'bl', 'br'].map((corner) => <View key={corner} style={[styles.bracket, corner.includes('t') ? { top: -2, borderTopWidth: 3 } : { bottom: -2, borderBottomWidth: 3 }, corner.includes('l') ? { left: -2, borderLeftWidth: 3 } : { right: -2, borderRightWidth: 3 }]} />)}
              </View>
              <View style={[styles.laser, { transform: [{ rotate: `${angle}deg` }] }]} />
              <View style={styles.previewBadge}><Text style={styles.badgeText}>{currentPhoto && !cameraEnabled ? 'FOTOĞRAF ÜZERİNDE KILAVUZ' : 'CANLI HİZALAMA KILAVUZU'}</Text></View>
            </View>
          </View>
          <View style={styles.level}><Text style={styles.text}>Manuel hiza {angle > 0 ? '+' : ''}{angle}°</Text><View style={styles.bubbleTrack}><View style={[styles.bubble, { transform: [{ translateX: angle * 2 }] }]} /></View><Text style={styles.caption}>Açı değeri çizginin dönüşüdür; şasi ölçümü değildir.</Text></View>
          <View style={styles.controls}>
            <RulerControl label="Açı" suffix="°" value={angle} min={-15} max={15} step={1} onChange={setAngle} />
            <RulerControl label="En" value={widthPercent} min={40} max={90} onChange={setWidthPercent} />
            <RulerControl label="Boy" value={heightPercent} min={20} max={80} onChange={setHeightPercent} />
          </View>
          <Text style={styles.caption}>{step === 1 ? 'Telefonu yandan, göz hizasında ve düz bir yüzey üzerinde çekin. Kamera çıkıntısını ve perspektif etkisini eğrilik sanmayın. Cihazı bükmeyin veya bastırmayın.' : 'Dört köşeyi yeterli ışıkta inceleyin. Darbe izlerini köşe çerçeveleriyle hizalayın; bütün köşeleri incelemeden onaylamayın. Kayıt için temsili bir fotoğraf seçin.'}</Text>
          {!!cameraError && <Text style={styles.warning} accessibilityRole="alert">{cameraError}</Text>}
          {!!error && <Text style={styles.warning} accessibilityRole="alert">{error}</Text>}
          <View style={styles.actionRow}>
            <Pressable testID="visual-capture" accessibilityRole="button" disabled={!cameraReady || busy || !cameraEnabled} accessibilityState={{ disabled: !cameraReady || busy || !cameraEnabled, busy }} onPress={() => { void capture(); }} style={[styles.primary, (!cameraReady || busy || !cameraEnabled) && styles.disabled]}><Camera size={18} color="#0b0f19" /><Text style={styles.primaryText}>{busy ? 'İşleniyor…' : 'Fotoğraf çek'}</Text></Pressable>
            <Pressable testID="visual-upload" accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy }} onPress={() => { void upload(); }} style={[styles.secondary, busy && styles.disabled]}><Upload size={18} color="#67e8f9" /><Text style={styles.text}>Fotoğraf yükle</Text></Pressable>
          </View>
          <Pressable accessibilityRole="button" disabled={busy || !foreground} onPress={restartCamera} style={styles.secondary}><Text style={styles.text}>Arka kamerayı aç / yeniden dene</Text></Pressable>
          {step === 1 ? <View style={styles.options}>
            {([{ id: 'straight', label: 'Düz / Bükülme Yok' }, { id: 'bent', label: 'Şaside Bükülme / Eğrilik Var' }] as const).map((item) => <Pressable testID={`visual-chassis-${item.id}`} key={item.id} accessibilityRole="radio" accessibilityLabel={item.label} accessibilityState={{ checked: chassis === item.id, disabled: !photos.chassis }} disabled={!photos.chassis} onPress={() => setChassis(item.id)} style={[styles.option, chassis === item.id && styles.selected, !photos.chassis && styles.disabled]}><Text style={styles.text}>{item.label}</Text></Pressable>)}
          </View> : <View style={styles.options}>
            {(['pristine', 'hairline', 'dented'] as const).map((condition) => <Pressable key={condition} testID={`visual-cosmetic-${condition}`} accessibilityRole="radio" accessibilityLabel={VISUAL_CONDITIONS[condition].label} accessibilityState={{ checked: cosmetic === condition, disabled: !photos.corners }} disabled={!photos.corners} onPress={() => setCosmetic(condition)} style={[styles.option, cosmetic === condition && styles.selected, !photos.corners && styles.disabled]}><Text style={styles.text}>{VISUAL_CONDITIONS[condition].score.toLocaleString('tr-TR')}/10 · {VISUAL_CONDITIONS[condition].label}</Text></Pressable>)}
          </View>}
          <Text style={styles.caption}>{currentPhoto ? `Fotoğraf eklendi · ${currentPhoto.source === 'camera' ? 'Kamera çekimi' : 'Cihazdan seçildi'}` : 'Devam etmeden önce bu adım için bir fotoğraf çekin veya yükleyin.'}</Text>
          <Pressable testID="visual-next" accessibilityRole="button" disabled={!canNext || busy} accessibilityState={{ disabled: !canNext || busy }} onPress={next} style={[styles.primary, (!canNext || busy) && styles.disabled]}><Text style={styles.primaryText}>{step === 1 ? 'Köşe incelemesine geç' : 'Kozmetik puanını göster'}</Text></Pressable>
          {step === 2 && <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setStep(1); setWidthPercent(80); setHeightPercent(32); setAngle(0); setCameraEnabled(false); }} style={styles.secondary}><Text style={styles.text}>Şasi adımına dön</Text></Pressable>}
        </> : summary && <>
          <View style={styles.summary}><Text style={styles.caption}>KASA KONDİSYONU</Text><Text style={styles.score} testID="visual-score">{summary.score.toLocaleString('tr-TR')}/10</Text><Text style={styles.stepTitle}>{summary.label}</Text><Text style={styles.caption}>Şasi: {summary.chassis === 'bent' ? 'Eğrilik / kasa açıklığı bildirildi' : 'Düz olarak onaylandı'}</Text>{summary.cosmetic === 'dented' && <Text style={styles.warning}>Vuruklar düşme geçmişiyle uyumlu olabilir; geçmişi yalnızca fotoğrafla kesinleştirmek mümkün değildir.</Text>}</View>
          <View style={styles.photoRow}>{(['chassis', 'corners'] as const).map((key) => <View key={key} style={styles.photoTile}><Image accessibilityLabel={key === 'chassis' ? 'Kaydedilen şasi fotoğrafı' : 'Kaydedilen köşe fotoğrafı'} source={{ uri: summary.photos[key].dataUri }} style={styles.thumbnail} resizeMode="contain" /><Text style={styles.caption}>{key === 'chassis' ? 'Şasi' : 'Köşe / çizik'} · {summary.photos[key].source === 'camera' ? 'Çekim' : 'Yükleme'}</Text></View>)}</View>
          <Text style={styles.caption}>Fotoğraflar bu analiz oturumunda cihazınızda tutulur. “Ekspertize aktar” seçilirse PDF raporuna da eklenir. Sunucuya gönderilmez. Sonuç sizin gözlem ve onayınıza dayanır.</Text>
          <Pressable testID="visual-apply" accessibilityRole="button" onPress={() => { setCameraEnabled(false); onComplete(summary); }} style={styles.primary}><Text style={styles.primaryText}>Kasa Kondisyonu: {visualScoreLabel(summary)} · Ekspertize aktar</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => setStep(2)} style={styles.secondary}><Text style={styles.text}>Değerlendirmeyi düzenle</Text></Pressable>
        </>}
      </ScrollView>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  page: { flex: 1, minHeight: 0, backgroundColor: '#0b0f19', paddingHorizontal: 16, gap: 13 }, header: { flexDirection: 'row', gap: 10, alignItems: 'center' }, grow: { flex: 1, minWidth: 0 }, title: { color: '#f8fafc', fontSize: 20, fontWeight: '800' },
  scroll: { flex: 1, minHeight: 0 }, content: { gap: 15, paddingBottom: 22 }, stepTitle: { color: '#f8fafc', fontSize: 18, lineHeight: 25, fontWeight: '700' }, text: { color: '#f8fafc', fontSize: 13, lineHeight: 20, flexShrink: 1 }, caption: { color: '#94a3b8', fontSize: 12, lineHeight: 19, flexShrink: 1 },
  progress: { height: 4, borderRadius: 3, backgroundColor: '#22304a' }, progressFill: { height: '100%', borderRadius: 3, backgroundColor: '#22d3ee' },
  preview: { height: 300, position: 'relative', overflow: 'hidden', backgroundColor: '#111827', borderRadius: 24, borderWidth: 1, borderColor: '#334155', alignItems: 'center', justifyContent: 'center' }, empty: { alignItems: 'center', gap: 12, padding: 20 },
  guide: { position: 'absolute', borderWidth: 1, borderColor: '#22d3ee88', borderRadius: 16 },
  bracket: { position: 'absolute', width: 26, height: 26, borderColor: '#67e8f9', borderRadius: 4 }, crossHorizontal: { position: 'absolute', height: 1, left: 0, right: 0, top: '50%', backgroundColor: '#22d3ee66' }, crossVertical: { position: 'absolute', width: 1, top: 0, bottom: 0, left: '50%', backgroundColor: '#22d3ee66' },
  laser: { position: 'absolute', top: '50%', left: 10, right: 10, height: 2, backgroundColor: '#34d399', shadowColor: '#10b981', shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  previewBadge: { position: 'absolute', left: 12, top: 12, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#0b0f19d9' }, badgeText: { color: '#67e8f9', fontSize: 9, letterSpacing: 1, fontWeight: '800' },
  level: { alignItems: 'center', gap: 8, backgroundColor: '#111827cc', borderRadius: 16, padding: 12 }, bubbleTrack: { width: 100, height: 13, borderWidth: 1, borderColor: '#64748b', borderRadius: 10, alignItems: 'center' }, bubble: { width: 22, height: 9, marginTop: 1, borderRadius: 5, backgroundColor: '#34d399' },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'center' }, rulerControl: { flexDirection: 'row', alignItems: 'center', gap: 5 }, smallButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: '#1f2937', borderWidth: 1, borderColor: '#374151' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, primary: { minHeight: 50, padding: 14, borderRadius: 25, backgroundColor: '#67e8f9', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }, primaryText: { color: '#0b0f19', fontSize: 13, lineHeight: 20, textAlign: 'center', fontWeight: '800', flexShrink: 1 }, secondary: { minHeight: 48, padding: 13, borderRadius: 24, borderWidth: 1, borderColor: '#374151', backgroundColor: '#111827e6', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  options: { gap: 10 }, option: { padding: 14, minHeight: 48, borderRadius: 14, backgroundColor: '#111827', borderColor: '#374151', borderWidth: 1 }, selected: { backgroundColor: '#083344', borderColor: '#67e8f9' }, warning: { color: '#fdba74', fontSize: 12, lineHeight: 20 }, disabled: { opacity: 0.4 },
  summary: { alignItems: 'center', padding: 24, gap: 9, borderWidth: 1, borderColor: '#22d3ee66', borderRadius: 24, backgroundColor: '#111827' }, score: { color: '#67e8f9', fontSize: 56, lineHeight: 66, fontWeight: '800' }, photoRow: { flexDirection: 'row', gap: 10 }, photoTile: { flex: 1, minWidth: 0, gap: 7 }, thumbnail: { width: '100%', height: 150, borderRadius: 12, backgroundColor: '#111827' },
});
