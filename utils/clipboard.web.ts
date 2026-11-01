/**
 * Browser writes require a user gesture and a secure context. Avoid the SDK's
 * legacy execCommand fallback, which can report success when copying returns
 * false. The report presents selectable text when this API is unavailable.
 */
export async function copyReportText(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText)
    return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
