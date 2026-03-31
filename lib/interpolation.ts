import type { Position } from './types';

/**
 * Linearly interpolate between two sets of token positions.
 * @param from - positions at the start keyframe
 * @param to - positions at the end keyframe
 * @param progress - 0.0 to 1.0
 * @returns interpolated positions for all tokens present in either keyframe
 */
export function interpolatePositions(
  from: Record<string, Position>,
  to: Record<string, Position>,
  progress: number
): Record<string, Position> {
  const clamped = Math.max(0, Math.min(1, progress));
  const allIds = new Set([...Object.keys(from), ...Object.keys(to)]);
  const result: Record<string, Position> = {};

  for (const id of allIds) {
    const a = from[id];
    const b = to[id];

    if (a && b) {
      result[id] = {
        x: a.x + (b.x - a.x) * clamped,
        y: a.y + (b.y - a.y) * clamped,
      };
    } else if (a) {
      result[id] = { x: a.x, y: a.y };
    } else if (b) {
      result[id] = { x: b.x, y: b.y };
    }
  }

  return result;
}
