import type { FieldSpeechController, FieldSpeechStatus } from '../types/fieldInspection';

/** One current utterance; stale browser events never restart an old step. */
export function createFieldSpeech(onStatus: (status: FieldSpeechStatus, message: string) => void): FieldSpeechController {
  let generation = 0;
  let disposed = false;
  let utterance: SpeechSynthesisUtterance | null = null;
  let startTimer: ReturnType<typeof setTimeout> | undefined;
  let endTimer: ReturnType<typeof setTimeout> | undefined;
  const synth = typeof window === 'undefined' ? undefined : window.speechSynthesis;
  let voices: SpeechSynthesisVoice[] = [];
  const voicesChanged = () => { try { voices = synth?.getVoices() ?? []; } catch { voices = []; } };
  synth?.addEventListener?.('voiceschanged', voicesChanged);
  const cancel = () => {
    generation++;
    if (startTimer) clearTimeout(startTimer); if (endTimer) clearTimeout(endTimer);
    startTimer = undefined; endTimer = undefined;
    if (utterance) { utterance.onstart = null; utterance.onend = null; utterance.onerror = null; utterance = null; }
    try { synth?.cancel(); } catch { /* Unsupported speech must never block the field workflow. */ }
  };
  const speak = (text: string) => {
    cancel();
    if (disposed) return;
    if (!synth || typeof window.SpeechSynthesisUtterance !== 'function') { onStatus('silent', 'Ses sentezi desteklenmiyor. Büyük butonlarla sessiz devam edebilirsiniz.'); return; }
    const token = generation;
    try {
      const current = new window.SpeechSynthesisUtterance(text); utterance = current;
      current.lang = 'tr-TR'; current.rate = 0.9; current.pitch = 1; current.volume = 1;
      voicesChanged();
      const turkish = voices.find((voice) => voice.lang.toLowerCase().replace('_', '-') === 'tr-tr' && voice.localService)
        ?? voices.find((voice) => /^tr(?:[-_]|$)/i.test(voice.lang));
      if (turkish) current.voice = turkish;
      const fallback = () => { if (disposed || token !== generation) return; cancel(); onStatus('silent', 'Ses başlatılamadı. Sessiz devam edin veya Tekrar Dinle ile yeniden deneyin.'); };
      current.onstart = () => { if (disposed || token !== generation) return; if (startTimer) clearTimeout(startTimer); onStatus('speaking', 'Türkçe yönerge okunuyor.'); };
      current.onend = () => { if (disposed || token !== generation) return; cancel(); onStatus('idle', 'Kontrolü yapıp sonucu seçin.'); };
      current.onerror = fallback;
      startTimer = setTimeout(fallback, 4500);
      endTimer = setTimeout(fallback, 60000);
      onStatus('idle', 'Ses başlatılıyor…');
      synth.speak(current);
    } catch { cancel(); onStatus('silent', 'Ses kullanılamıyor. Büyük butonlarla devam edebilirsiniz.'); }
  };
  const hidden = () => { if (document.hidden) { cancel(); if (!disposed) onStatus('paused', 'Ses arka planda durduruldu. Hazır olduğunuzda Tekrar Dinle seçin.'); } };
  const pagehide = () => { cancel(); };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', hidden);
  if (typeof window !== 'undefined') window.addEventListener('pagehide', pagehide);
  return { speak, cancel, dispose: () => { disposed = true; cancel(); synth?.removeEventListener?.('voiceschanged', voicesChanged); if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', hidden); if (typeof window !== 'undefined') window.removeEventListener('pagehide', pagehide); } };
}
