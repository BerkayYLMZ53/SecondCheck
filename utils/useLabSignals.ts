import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

export function useLabSignals() {
  const player = useAudioPlayer(require('../assets/diagnostic-tones.wav'));
  const [busy, setBusy] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [message, setMessage] = useState('Sesi düşük seviyeye alın; kulaklık ve Bluetooth bağlantısını kapatın.');
  const epoch = useRef(0);
  const mounted = useRef(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const vibrationWait = useRef<{ timer: ReturnType<typeof setTimeout>; resolve: () => void } | null>(null);
  const stop = useCallback(() => {
    epoch.current++; timers.current.forEach(clearTimeout); timers.current = [];
    if (vibrationWait.current) { clearTimeout(vibrationWait.current.timer); vibrationWait.current.resolve(); vibrationWait.current = null; }
    player.pause(); setBusy(false); setAudioReady(false);
  }, [player]);
  useEffect(() => {
    mounted.current = true;
    const generation = epoch;
    const pendingTimers = timers;
    const pendingVibration = vibrationWait;
    const subscription = AppState.addEventListener('change', (state) => { if (state !== 'active') stop(); });
    const playback = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish && mounted.current) {
        timers.current.forEach(clearTimeout); timers.current = [];
        setBusy(false); setAudioReady(true); setMessage('200 Hz ve 2000 Hz tamamlandı. Duyduğunuz sonucu kaydedin.');
      }
    });
    return () => {
      mounted.current = false; generation.current++; pendingTimers.current.forEach(clearTimeout);
      if (pendingVibration.current) { clearTimeout(pendingVibration.current.timer); pendingVibration.current.resolve(); pendingVibration.current = null; }
      player.pause(); playback.remove(); subscription.remove();
    };
  }, [player, stop]);
  const startAudio = async () => {
    stop(); const token = epoch.current; setBusy(true);
    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      if (token !== epoch.current) return;
      await player.seekTo(0);
      if (token !== epoch.current) return;
      player.play(); setMessage('200 Hz → kısa ara → 2000 Hz • Sistem ses çıkışı kullanılıyor.');
      timers.current.push(setTimeout(() => { if (token === epoch.current) { player.pause(); setBusy(false); setMessage('Ses tamamlanamadıysa yeniden deneyin.'); } }, 10000));
    } catch { if (token === epoch.current && mounted.current) { setBusy(false); setMessage('Ses testi başlatılamadı.'); } }
  };
  const vibrate = async (): Promise<boolean | null> => {
    const token = epoch.current;
    try {
      for (const strength of [Haptics.ImpactFeedbackStyle.Light, Haptics.ImpactFeedbackStyle.Medium, Haptics.ImpactFeedbackStyle.Heavy]) {
        if (token !== epoch.current || !mounted.current) return null;
        await Haptics.impactAsync(strength);
        if (token !== epoch.current || !mounted.current) return null;
        await new Promise<void>((resolve) => {
          const timer = setTimeout(() => { vibrationWait.current = null; resolve(); }, 180);
          vibrationWait.current = { timer, resolve };
        });
      }
      if (token !== epoch.current || !mounted.current) return null;
      if (mounted.current) setMessage('Hafif, orta ve güçlü haptik komutları gönderildi. Hissettiğiniz sonucu onaylayın.');
      return true;
    } catch { if (mounted.current) setMessage('Haptik API bu cihazda kullanılamıyor.'); return false; }
  };
  return { busy, audioReady, message, startAudio, vibrate, stop };
}
