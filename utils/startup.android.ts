import { Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

export const STARTUP_TIMEOUT_MS = 2500;

export async function hideNativeSplash(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await SplashScreen.hideAsync();
  } catch (error) {
    console.warn('Android splash could not be hidden.', error);
  }
}

export function beginStartup(): void {
  if (Platform.OS !== 'android') return;
  // Do not hold the native splash. This retry also covers module-load failures.
  setTimeout(() => { void hideNativeSplash(); }, STARTUP_TIMEOUT_MS);
}
