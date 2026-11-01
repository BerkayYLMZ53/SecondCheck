import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
} from 'expo-audio';
import type { AudioPhase, DiagnosticAudio } from './diagnosticAudio.types';

export function useDiagnosticAudio(): DiagnosticAudio {
  const sweep = useAudioPlayer(require('../assets/diagnostic-sweep.wav'));
  const playback = useAudioPlayer(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [phase, setPhase] = useState<AudioPhase>('idle');
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState('Bir ses testi seçin.');
  const epoch = useRef(0);
  const busy = useRef(false);
  const recording = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const cleanup = useCallback(() => {
    epoch.current++;
    busy.current = false;
    if (timer.current) clearTimeout(timer.current);
    if (ticker.current) clearInterval(ticker.current);
    sweep.pause();
    playback.pause();
    if (recording.current) {
      recording.current = false;
      void recorder.stop().catch(() => {});
    }
    void setAudioModeAsync({ allowsRecording: false }).catch(() => {});
  }, [sweep, playback, recorder]);
  const stop = useCallback(() => {
    cleanup();
    setPhase('idle');
    setSeconds(0);
    setMessage('Test durduruldu.');
  }, [cleanup]);
  const fail = (token: number) => {
    if (token !== epoch.current) return;
    stop();
    setMessage(
      'Ses testi başlatılamadı. Mikrofon iznini ve ses çıkışını kontrol edin.',
    );
  };
  const startSweep = async () => {
    if (busy.current) return;
    busy.current = true;
    const token = ++epoch.current;
    setPhase('sweeping');
    setMessage('80 Hz → 8.000 Hz • 6 saniyelik düşük seviyeli sinüs taraması.');
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
      });
      if (token !== epoch.current) return;
      await sweep.seekTo(0);
      if (token === epoch.current) sweep.play();
    } catch {
      fail(token);
    }
  };
  const startEcho = async () => {
    if (busy.current) return;
    busy.current = true;
    const token = ++epoch.current;
    setPhase('requesting');
    setMessage('Mikrofon izni bekleniyor…');
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (token !== epoch.current) return;
      if (!permission.granted) {
        stop();
        setMessage(
          'Mikrofon izni verilmedi. Cihaz ayarlarından izin verip tekrar deneyin.',
        );
        return;
      }
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
      if (token !== epoch.current) {
        await setAudioModeAsync({ allowsRecording: false });
        return;
      }
      await recorder.prepareToRecordAsync();
      if (token !== epoch.current) {
        await recorder.stop();
        return;
      }
      recorder.record();
      recording.current = true;
      setPhase('recording');
      setSeconds(3);
      setMessage('Konuşun; kayıt 3 saniye sonra otomatik oynatılacak.');
      let remaining = 3;
      ticker.current = setInterval(
        () => setSeconds(Math.max(0, --remaining)),
        1000,
      );
      timer.current = setTimeout(() => {
        void (async () => {
          try {
            await recorder.stop();
            recording.current = false;
            if (token !== epoch.current) return;
            if (ticker.current) clearInterval(ticker.current);
            setSeconds(0);
            await setAudioModeAsync({ allowsRecording: false });
            if (token !== epoch.current) return;
            if (!recorder.uri) throw new Error('Kayıt bulunamadı');
            playback.replace(recorder.uri);
            playback.play();
            setPhase('playing');
            setMessage('3 saniyelik kaydınız oynatılıyor…');
          } catch {
            fail(token);
          }
        })();
      }, 3000);
    } catch {
      fail(token);
    }
  };
  useEffect(() => {
    const subscriptions = [sweep, playback].map((player) =>
      player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish && busy.current) {
          busy.current = false;
          setPhase('idle');
          setMessage(
            'Test tamamlandı. Cızırtı, parazit veya ses kesilmesi var mı?',
          );
        }
      }),
    );
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [sweep, playback]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      // A system permission prompt can briefly make iOS inactive; it is not an app exit.
      if (state === 'background') stop();
    });
    return () => {
      subscription.remove();
      cleanup();
    };
  }, [cleanup, stop]);
  return { phase, seconds, message, startSweep, startEcho, stop };
}
