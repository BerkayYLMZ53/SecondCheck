import { File, Paths } from 'expo-file-system';

/** Only temporary files created by this scanner, never the photo picked from the user's library. */
export function cleanupScannerPhoto(uri: string | undefined): void {
  if (!uri || !uri.startsWith(Paths.cache.uri) || uri === Paths.cache.uri) return;
  try { const file = new File(uri); if (file.exists) file.delete(); } catch { /* Best-effort cache cleanup. */ }
}
