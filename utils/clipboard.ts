import * as Clipboard from 'expo-clipboard';

/** Native clipboard implementation; errors are surfaced to the report UI. */
export function copyReportText(text: string): Promise<boolean> {
  return Clipboard.setStringAsync(text);
}
