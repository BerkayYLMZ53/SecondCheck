// Android-only surface: keep native blur out of this module graph.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentRef, ReactNode } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import type { ParsedListingResult } from '../types/listing';
import ListingAnalysisCard from '../components/ListingAnalysisCard';
import SpringBottomSheet from '../components/SpringBottomSheet';
import DynamicStatusPill from '../components/DynamicStatusPill';
import type { DynamicStatus } from '../components/DynamicStatusPill';

interface AnalysisPresentation {
  begin: () => void;
  complete: (result: ParsedListingResult, title: string, name: string, options?: { open?: boolean }) => void;
  fail: (message?: string) => void;
  reset: () => void;
  reopen: () => void;
}
const Context = createContext<AnalysisPresentation | null>(null);
export function AnalysisPresentationProvider({ children, active = true, enabled = true }: { children: ReactNode; active?: boolean; enabled?: boolean }) {
  const [snapshot, setSnapshot] = useState<{ result: ParsedListingResult; title: string; sequence: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<DynamicStatus>({ phase: 'idle', label: '', sequence: 0 });
  const sequence = useRef(0);
  const blurTarget = useRef<ComponentRef<typeof View> | null>(null);
  const begin = useCallback(() => { setOpen(false); setStatus({ phase: 'loading', label: 'İlan Çözümleniyor…', sequence: ++sequence.current }); }, []);
  const complete = useCallback((result: ParsedListingResult, title: string, name: string, options?: { open?: boolean }) => {
    const id = ++sequence.current;
    if (result.matchedDevice) { setSnapshot({ result, title, sequence: id }); setOpen(options?.open !== false); }
    setStatus({ phase: 'success', label: `${name} Hazır`, sequence: id });
  }, []);
  const fail = useCallback((message = 'İlan çözümlenemedi') => { setStatus({ phase: 'error', label: message, sequence: ++sequence.current }); }, []);
  const reset = useCallback(() => { sequence.current++; setOpen(false); setSnapshot(null); setStatus({ phase: 'idle', label: '', sequence: sequence.current }); }, []);
  const reopen = useCallback(() => setOpen(true), []);
  const close = useCallback(() => { Keyboard.dismiss(); setOpen(false); }, []);
  useEffect(() => {
    if (status.phase !== 'success' && status.phase !== 'error') return;
    const timer = setTimeout(() => setStatus((previous) => previous.sequence === status.sequence ? { ...previous, phase: 'idle' } : previous), 3000);
    return () => clearTimeout(timer);
  }, [status.phase, status.sequence]);
  const value = useMemo(() => ({ begin, complete, fail, reset, reopen }), [begin, complete, fail, reset, reopen]);
  const visible = open && active && enabled && snapshot !== null;
  return <Context.Provider value={value}><View style={styles.root}>
    <View ref={blurTarget} style={styles.root}>
      <View style={styles.root} pointerEvents={visible ? 'none' : 'auto'} aria-hidden={visible} accessibilityElementsHidden={visible} importantForAccessibility={visible ? 'no-hide-descendants' : 'auto'}>{children}</View>
    </View>
    <SpringBottomSheet open={visible} onClose={close} title="İlan Ekspertizi" blurTarget={blurTarget} testID="listing-analysis-sheet" resetKey={snapshot?.sequence}>
      {snapshot && <ListingAnalysisCard key={snapshot.sequence} result={snapshot.result} title={snapshot.title} active={visible} />}
    </SpringBottomSheet>
    <DynamicStatusPill status={status} active={active && enabled} />
  </View></Context.Provider>;
}
export function useAnalysisPresentation(): AnalysisPresentation {
  const context = useContext(Context);
  if (!context) throw new Error('İlan arayüzü AnalysisPresentationProvider içinde kullanılmalıdır.');
  return context;
}
const styles = StyleSheet.create({ root: { flex: 1, minHeight: 0, minWidth: 0 } });
