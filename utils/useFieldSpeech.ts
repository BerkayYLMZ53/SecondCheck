import { useCallback, useEffect, useRef, useState } from 'react';
import type { FieldSpeechController, FieldSpeechStatus } from '../types/fieldInspection';
import { createFieldSpeech } from './fieldSpeech';

export function useFieldSpeech() {
  const controller = useRef<FieldSpeechController | null>(null);
  const [feedback, setFeedback] = useState<{ status: FieldSpeechStatus; message: string }>({ status: 'idle', message: 'Türkçe sesli yönerge hazırlanıyor.' });
  useEffect(() => {
    const current = createFieldSpeech((status, message) => setFeedback({ status, message }));
    controller.current = current;
    return () => { controller.current = null; current.dispose(); };
  }, []);
  const speak = useCallback((text: string) => controller.current?.speak(text), []);
  const cancel = useCallback(() => controller.current?.cancel(), []);
  return { ...feedback, speak, cancel };
}
