import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/** Optional hardware feedback must never interrupt analysis or require a UI fallback. */
export async function playHaptic(kind: 'light' | 'success' | 'warning'): Promise<void> {
  if (Platform.OS === 'web' && (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function')) return;
  try {
    if (kind === 'light') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else await Haptics.notificationAsync(kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
  } catch { /* Unsupported hardware, browser restrictions or disabled system haptics. */ }
}
