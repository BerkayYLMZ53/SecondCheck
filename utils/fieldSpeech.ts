import * as Speech from 'expo-speech';
import { AppState } from 'react-native';
import type { FieldSpeechController, FieldSpeechStatus } from '../types/fieldInspection';

export function createFieldSpeech(onStatus: (status: FieldSpeechStatus, message: string) => void): FieldSpeechController {
  let generation = 0; let disposed = false;
  let stopped = Promise.resolve();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => { generation++; if (timer) clearTimeout(timer); timer = undefined; stopped = stopped.then(() => Speech.stop()).catch(() => {}); };
  const speak = (text: string) => {
    cancel(); if (disposed) return; const token = generation;
    const fallback = () => { if (disposed || token !== generation) return; cancel(); onStatus('silent', 'Ses kullanılamıyor. Sessiz modu veya Tekrar Dinle seçeneğini kullanın. iOS sessiz anahtarını kontrol edin.'); };
    onStatus('idle', 'Ses başlatılıyor…');
    void stopped.then(() => {
      if (disposed || token !== generation) return;
      timer = setTimeout(fallback, 4500);
      Speech.speak(text, { language: 'tr-TR', rate: 0.9, pitch: 1,
        onStart: () => { if (disposed || token !== generation) return; if (timer) clearTimeout(timer); timer = setTimeout(fallback, 60000); onStatus('speaking', 'Türkçe yönerge okunuyor.'); },
        onDone: () => { if (disposed || token !== generation) return; generation++; if (timer) clearTimeout(timer); timer = undefined; onStatus('idle', 'Kontrolü yapıp sonucu seçin.'); }, onError: fallback });
    }).catch(fallback);
  };
  const subscription = AppState.addEventListener('change', (state) => { if (state !== 'active') { cancel(); if (!disposed) onStatus('paused', 'Ses arka planda durduruldu. Tekrar Dinle ile devam edin.'); } });
  return { speak, cancel, dispose: () => { disposed = true; cancel(); subscription.remove(); } };
}
