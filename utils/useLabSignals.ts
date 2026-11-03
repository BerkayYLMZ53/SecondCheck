import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as Haptics from 'expo-haptics';

export function useLabSignals() {
  const player = useAudioPlayer(require('../assets/diagnostic-tones.wav'));
  const status = useAudioPlayerStatus(player);
  const [busy, setBusy] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [message, setMessage] = useState('Sesi düşük seviyeye alın; kulaklık ve Bluetooth bağlantısını kapatın.');
  const epoch = useRef(0);
  const mounted = useRef(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stop = useCallback(() => { epoch.current++; timers.current.forEach(clearTimeout); timers.current = []; player.pause(); setBusy(false); setAudioReady(false); }, [player]);
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener('change', (state) => { if (state !== 'active') stop(); });
    return () => { mounted.current = false; epoch.current++; timers.current.forEach(clearTimeout); player.pause(); subscription.remove(); };
  }, [player, stop]);
  useEffect(() => {
    if (status.didJustFinish) { setBusy(false); setAudioReady(true); setMessage('200 Hz ve 2000 Hz tamamlandı. Duyduğunuz sonucu kaydedin.'); }
  }, [status.didJustFinish]);
  const startAudio = async () => {
    stop(); const token = epoch.current; setBusy(true);
    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      if (token !== epoch.current) return;
      await player.seekTo(0);
      if (token !== epoch.current) return;
      player.volume = 0.5; player.play(); setMessage('200 Hz → kısa ara → 2000 Hz • Sistem ses çıkışı kullanılıyor.');
      timers.current.push(setTimeout(() => { if (token === epoch.current) { player.pause(); setBusy(false); setMessage('Ses tamamlanamadıysa yeniden deneyin.'); } }, 10000));
    } catch { if (token === epoch.current && mounted.current) { setBusy(false); setMessage('Ses testi başlatılamadı.'); } }
  };
  const vibrate = async (): Promise<boolean> => {
    const token = epoch.current;
    try {
      for (const strength of [Haptics.ImpactFeedbackStyle.Light, Haptics.ImpactFeedbackStyle.Medium, Haptics.ImpactFeedbackStyle.Heavy]) {
        if (token !== epoch.current || !mounted.current) return false;
        await Haptics.impactAsync(strength);
      }
      if (mounted.current) setMessage('Hafif, orta ve güçlü haptik komutları gönderildi. Hissettiğiniz sonucu onaylayın.');
      return true;
    } catch { if (mounted.current) setMessage('Haptik API bu cihazda kullanılamıyor.'); return false; }
  };
  return { busy, audioReady, message, startAudio, vibrate, stop };
}
