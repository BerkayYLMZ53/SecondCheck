import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export type HapticKind = 'light' | 'medium' | 'success' | 'warning' | 'selection';

/** Optional hardware feedback must never interrupt analysis or require a UI fallback. */
export async function playHaptic(kind: HapticKind): Promise<void> {
  if (Platform.OS === 'web' && (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function')) return;
  try {
    if (kind === 'light') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (kind === 'medium') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else if (kind === 'selection') await Haptics.selectionAsync();
    else await Haptics.notificationAsync(kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
  } catch { /* Unsupported hardware, browser restrictions or disabled system haptics. */ }
}

export const triggerLight = (): Promise<void> => playHaptic('light');
export const triggerMedium = (): Promise<void> => playHaptic('medium');
export const triggerSuccess = (): Promise<void> => playHaptic('success');
export const triggerWarning = (): Promise<void> => playHaptic('warning');
export const triggerSelection = (): Promise<void> => playHaptic('selection');
