export function sheetHeight(viewportHeight: number, topInset: number, fraction = 0.88): number {
  const safeHeight = Math.max(160, viewportHeight - topInset - 12);
  return Math.min(safeHeight, Math.max(160, viewportHeight * Math.min(0.96, Math.max(0.4, fraction))));
}
export function sheetDragOffset(dy: number): number { return dy < 0 ? Math.max(-20, dy * 0.12) : dy; }
export function shouldDismissSheet(dy: number, velocity: number, height: number): boolean {
  return dy > Math.min(140, height * 0.2) || (dy > 24 && velocity > 0.9);
}
export function statusPillWidth(label: string, viewportWidth: number): number {
  return Math.max(120, Math.min(viewportWidth - 32, Math.max(210, 68 + label.length * 6.3)));
}
