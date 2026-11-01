export const GRID_COLUMNS = 6;
export const GRID_ROWS = 10;
export const GRID_TOTAL = GRID_COLUMNS * GRID_ROWS;

export interface GridPoint {
  x: number;
  y: number;
}

// Interpolate fast swipes so cells between two touch events are not skipped.
export function traceGridCells(
  from: GridPoint,
  to: GridPoint,
  width: number,
  height: number,
): number[] {
  if (width <= 0 || height <= 0) return [];
  const steps = Math.max(
    1,
    Math.ceil(
      Math.hypot(to.x - from.x, to.y - from.y) /
        (Math.min(width / GRID_COLUMNS, height / GRID_ROWS) / 3),
    ),
  );
  const cells = new Set<number>();
  for (let step = 0; step <= steps; step++) {
    const x = from.x + ((to.x - from.x) * step) / steps;
    const y = from.y + ((to.y - from.y) * step) / steps;
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    cells.add(
      Math.floor((y / height) * GRID_ROWS) * GRID_COLUMNS +
        Math.floor((x / width) * GRID_COLUMNS),
    );
  }
  return [...cells];
}
