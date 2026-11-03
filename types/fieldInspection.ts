export type FieldStepId = 'buttons' | 'screen' | 'audio' | 'camera' | 'port' | 'account';
export interface FieldTestStep { id: FieldStepId; title: string; instruction: string; spoken: string }
export interface FieldStepResult extends FieldTestStep { status: 'pass' | 'fail'; answeredAt: string }
export interface FieldInspectionReport { results: FieldStepResult[]; completedAt: string; source: 'guided-user-observation' }
export type FieldSpeechStatus = 'idle' | 'speaking' | 'silent' | 'paused';
export interface FieldSpeechController { speak: (text: string) => void; cancel: () => void; dispose: () => void }
