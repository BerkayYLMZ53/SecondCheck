import { Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

export const STARTUP_TIMEOUT_MS = 2500;

/** Safe to call from initialization, layout, the watchdog and the error screen. */
export async function hideNativeSplash(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await SplashScreen.hideAsync();
  } catch (error) {
    console.warn('Native splash could not be hidden.', error);
  }
}

/** Run before loading application modules; do not await the native hold. */
export function beginStartup(): void {
  if (Platform.OS === 'web') return;
  setTimeout(() => { void hideNativeSplash(); }, STARTUP_TIMEOUT_MS);
  try {
    void SplashScreen.preventAutoHideAsync().catch((error: unknown) => {
      console.warn('Native splash could not be held.', error);
    });
  } catch (error) {
    console.warn('Native splash could not be held.', error);
  }
}
