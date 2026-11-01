export type AudioPhase =
  'idle' | 'requesting' | 'sweeping' | 'recording' | 'playing';
export interface DiagnosticAudio {
  phase: AudioPhase;
  seconds: number;
  message: string;
  startSweep: () => Promise<void>;
  startEcho: () => Promise<void>;
  stop: () => void;
}
