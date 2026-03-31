import { describe, it, expect } from 'vitest';
import { interpolatePositions } from '@/lib/interpolation';
import type { Position } from '@/lib/types';

describe('interpolatePositions', () => {
  it('returns "from" positions at progress 0', () => {
    const from: Record<string, Position> = { a: { x: 0, y: 0 } };
    const to: Record<string, Position> = { a: { x: 1, y: 1 } };
    const result = interpolatePositions(from, to, 0);
    expect(result.a).toEqual({ x: 0, y: 0 });
  });

  it('returns "to" positions at progress 1', () => {
    const from: Record<string, Position> = { a: { x: 0, y: 0 } };
    const to: Record<string, Position> = { a: { x: 1, y: 1 } };
    const result = interpolatePositions(from, to, 1);
    expect(result.a).toEqual({ x: 1, y: 1 });
  });

  it('interpolates linearly at progress 0.5', () => {
    const from: Record<string, Position> = { a: { x: 0, y: 0 } };
    const to: Record<string, Position> = { a: { x: 1, y: 0.8 } };
    const result = interpolatePositions(from, to, 0.5);
    expect(result.a.x).toBeCloseTo(0.5);
    expect(result.a.y).toBeCloseTo(0.4);
  });

  it('handles token only in "from"', () => {
    const from: Record<string, Position> = { a: { x: 0.3, y: 0.7 } };
    const to: Record<string, Position> = {};
    const result = interpolatePositions(from, to, 0.5);
    expect(result.a).toEqual({ x: 0.3, y: 0.7 });
  });

  it('handles token only in "to"', () => {
    const from: Record<string, Position> = {};
    const to: Record<string, Position> = { b: { x: 0.6, y: 0.2 } };
    const result = interpolatePositions(from, to, 0.5);
    expect(result.b).toEqual({ x: 0.6, y: 0.2 });
  });

  it('handles multiple tokens', () => {
    const from: Record<string, Position> = {
      a: { x: 0, y: 0 },
      b: { x: 1, y: 1 },
    };
    const to: Record<string, Position> = {
      a: { x: 1, y: 1 },
      b: { x: 0, y: 0 },
    };
    const result = interpolatePositions(from, to, 0.25);
    expect(result.a.x).toBeCloseTo(0.25);
    expect(result.b.x).toBeCloseTo(0.75);
  });

  it('clamps progress to 0-1 range', () => {
    const from: Record<string, Position> = { a: { x: 0, y: 0 } };
    const to: Record<string, Position> = { a: { x: 1, y: 1 } };

    const under = interpolatePositions(from, to, -0.5);
    expect(under.a).toEqual({ x: 0, y: 0 });

    const over = interpolatePositions(from, to, 1.5);
    expect(over.a).toEqual({ x: 1, y: 1 });
  });
});
