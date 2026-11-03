import { useCallback, useEffect, useRef, useState } from 'react';

/** No microphone permission: this only generates tones through the current output. */
export function useLabSignals() {
  const [busy, setBusy] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [message, setMessage] = useState('Sesi düşük seviyeye alın; kulaklık ve Bluetooth bağlantısını kapatın.');
  const context = useRef<AudioContext | null>(null);
  const epoch = useRef(0);
  const mounted = useRef(true);
  const cleanup = useCallback(() => {
    epoch.current++;
    const current = context.current; context.current = null;
    if (current && current.state !== 'closed') void current.close().catch(() => {});
    navigator.vibrate?.(0);
  }, []);
  const stop = useCallback(() => { cleanup(); if (mounted.current) { setBusy(false); setAudioReady(false); } }, [cleanup]);
  useEffect(() => {
    mounted.current = true;
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hide); window.addEventListener('pagehide', stop);
    return () => { mounted.current = false; cleanup(); document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', stop); };
  }, [cleanup, stop]);
  const startAudio = async () => {
    cleanup(); const token = epoch.current;
    setBusy(true); setAudioReady(false);
    try {
      const Constructor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Constructor) throw new Error('Bu tarayıcı Web Audio testini desteklemiyor.');
      const audio = new Constructor(); context.current = audio;
      await audio.resume();
      if (token !== epoch.current) return;
      const now = audio.currentTime;
      const oscillator = audio.createOscillator(); const gain = audio.createGain();
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(200, now); oscillator.frequency.setValueAtTime(2000, now + 2.2);
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.06, now + 0.08);
      gain.gain.setValueAtTime(0.06, now + 1.9); gain.gain.linearRampToValueAtTime(0, now + 2);
      gain.gain.setValueAtTime(0, now + 2.2); gain.gain.linearRampToValueAtTime(0.06, now + 2.28);
      gain.gain.setValueAtTime(0.06, now + 4.1); gain.gain.linearRampToValueAtTime(0, now + 4.2);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.onended = () => {
        if (token !== epoch.current || !mounted.current) return;
        cleanup(); setBusy(false); setAudioReady(true); setMessage('200 Hz ve 2000 Hz tamamlandı. Duyduğunuz sonucu kaydedin.');
      };
      oscillator.start(now); oscillator.stop(now + 4.3);
      setMessage('200 Hz → kısa ara → 2000 Hz • Mevcut cihaz ses çıkışı kullanılıyor.');
    } catch (error) {
      if (token !== epoch.current || !mounted.current) return;
      cleanup(); setBusy(false); setMessage(error instanceof Error ? error.message : 'Ses başlatılamadı.');
    }
  };
  const vibrate = async (): Promise<boolean> => {
    try { const supported = !!navigator.vibrate?.([100, 100, 200, 100, 300]); setMessage(supported ? 'Kısa, orta ve uzun ritim gönderildi. Hissettiğiniz sonucu onaylayın.' : 'Titreşim API’si bu tarayıcıda kullanılamıyor.'); return supported; }
    catch { setMessage('Titreşim bu ortamda kullanılamıyor.'); return false; }
  };
  return { busy, audioReady, message, startAudio, vibrate, stop };
}
