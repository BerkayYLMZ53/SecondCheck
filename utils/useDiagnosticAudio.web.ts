import { useCallback, useEffect, useRef, useState } from 'react';
import type { AudioPhase, DiagnosticAudio } from './diagnosticAudio.types';

export function useDiagnosticAudio(): DiagnosticAudio {
  const [phase, setPhase] = useState<AudioPhase>('idle');
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState('Bir ses testi seçin.');
  const session = useRef(0);
  const busy = useRef(false);
  const context = useRef<AudioContext | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    session.current++;
    busy.current = false;
    if (timer.current) clearTimeout(timer.current);
    if (ticker.current) clearInterval(ticker.current);
    timer.current = null;
    ticker.current = null;
    const recording = recorder.current;
    recorder.current = null;
    if (recording) {
      recording.onstop = null;
      recording.ondataavailable = null;
      recording.onerror = null;
      if (recording.state !== 'inactive') recording.stop();
    }
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    const activeContext = context.current;
    context.current = null;
    if (activeContext && activeContext.state !== 'closed')
      void activeContext.close().catch(() => {});
  }, []);
  const stop = useCallback(() => {
    cleanup();
    setPhase('idle');
    setSeconds(0);
    setMessage('Test durduruldu.');
  }, [cleanup]);
  const finish = (token: number, text: string) => {
    if (token !== session.current) return;
    cleanup();
    setPhase('idle');
    setSeconds(0);
    setMessage(text);
  };
  const openContext = () => {
    const Constructor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Constructor) throw new Error('Bu tarayıcı ses testini desteklemiyor.');
    const audio = new Constructor();
    context.current = audio;
    return audio;
  };
  const startSweep = async () => {
    if (busy.current) return;
    busy.current = true;
    const token = ++session.current;
    setPhase('sweeping');
    setMessage('80 Hz → 8.000 Hz • 6 saniyelik düşük seviyeli sinüs taraması.');
    try {
      const audio = openContext();
      await audio.resume();
      if (token !== session.current) return;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const now = audio.currentTime;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(80, now);
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.min(8000, audio.sampleRate * 0.45),
        now + 6,
      );
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.1);
      gain.gain.setValueAtTime(0.06, now + 5.9);
      gain.gain.linearRampToValueAtTime(0, now + 6);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.onended = () =>
        finish(
          token,
          'Tarama tamamlandı. Cızırtı, titreşim veya ses kesilmesi duydunuz mu?',
        );
      oscillator.start(now);
      oscillator.stop(now + 6);
    } catch (error) {
      finish(
        token,
        error instanceof Error ? error.message : 'Ses başlatılamadı.',
      );
    }
  };
  const startEcho = async () => {
    if (busy.current) return;
    busy.current = true;
    const token = ++session.current;
    setPhase('requesting');
    setMessage('Mikrofon izni bekleniyor…');
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === 'undefined'
      ) {
        throw new Error(
          'Mikrofon kaydı için HTTPS veya localhost üzerinde desteklenen bir tarayıcı kullanın.',
        );
      }
      const audio = openContext();
      await audio.resume();
      if (token !== session.current) return;
      const input = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });
      if (token !== session.current) {
        input.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = input;
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4'].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const recording = new MediaRecorder(
        input,
        mimeType ? { mimeType } : undefined,
      );
      recorder.current = recording;
      const chunks: Blob[] = [];
      recording.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recording.onerror = () =>
        finish(token, 'Mikrofon kaydı başarısız oldu. Tekrar deneyin.');
      recording.onstop = () => {
        input.getTracks().forEach((track) => track.stop());
        if (ticker.current) clearInterval(ticker.current);
        if (token !== session.current) return;
        setSeconds(0);
        setPhase('playing');
        setMessage('3 saniyelik kaydınız oynatılıyor…');
        void (async () => {
          try {
            const buffer = await audio.decodeAudioData(
              await new Blob(chunks, {
                type: recording.mimeType,
              }).arrayBuffer(),
            );
            if (token !== session.current) return;
            await audio.resume();
            if (token !== session.current) return;
            const source = audio.createBufferSource();
            source.buffer = buffer;
            source.connect(audio.destination);
            source.onended = () =>
              finish(
                token,
                'Kayıt oynatıldı. Sesiniz net mi, kesilme veya parazit var mı?',
              );
            source.start();
          } catch {
            finish(
              token,
              'Kayıt oynatılamadı. Başka bir tarayıcıda tekrar deneyin.',
            );
          }
        })();
      };
      recording.start();
      setPhase('recording');
      setSeconds(3);
      setMessage('Konuşun; kayıt 3 saniye sonra otomatik oynatılacak.');
      let remaining = 3;
      ticker.current = setInterval(
        () => setSeconds(Math.max(0, --remaining)),
        1000,
      );
      timer.current = setTimeout(() => {
        if (recording.state === 'recording') recording.stop();
      }, 3000);
    } catch (error) {
      const denied =
        error instanceof DOMException &&
        ['NotAllowedError', 'SecurityError'].includes(error.name);
      finish(
        token,
        denied
          ? 'Mikrofon izni verilmedi. Tarayıcı ayarlarından izin verip tekrar deneyin.'
          : error instanceof Error
            ? error.message
            : 'Mikrofon kullanılamıyor.',
      );
    }
  };
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) stop();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', stop);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', stop);
      cleanup();
    };
  }, [cleanup, stop]);
  return { phase, seconds, message, startSweep, startEcho, stop };
}
