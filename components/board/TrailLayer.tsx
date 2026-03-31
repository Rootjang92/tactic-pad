"use client";

import { Layer, Line } from "react-konva";
import { useTacticStore } from "@/stores/useTacticStore";
import { FIELD_PADDING, TRAIL_COLOR, TRAIL_OPACITY, TRAIL_DASH, TRAIL_WIDTH } from "@/lib/constants";
import type { Position } from "@/lib/types";

interface TrailLayerProps {
  width: number;
  height: number;
  interpolatedPositions?: Record<string, Position> | null;
  isPlaying?: boolean;
}

export default function TrailLayer({
  width,
  height,
  interpolatedPositions,
  isPlaying = false,
}: TrailLayerProps) {
  const tokens = useTacticStore((s) => s.project.tokens);
  const keyframes = useTacticStore((s) => s.project.keyframes);

  if (!isPlaying || !interpolatedPositions || keyframes.length < 2) return <Layer listening={false} />;

  const p = FIELD_PADDING;
  const fw = width - p * 2;
  const fh = height - p * 2;

  const toPixel = (pos: Position) => [p + pos.x * fw, p + pos.y * fh];

  // Draw trail from first keyframe position to current interpolated position
  const startPositions = keyframes[0].positions;

  return (
    <Layer listening={false}>
      {tokens.map((token) => {
        const start = startPositions[token.id];
        const current = interpolatedPositions[token.id];
        if (!start || !current) return null;

        const [sx, sy] = toPixel(start);
        const [cx, cy] = toPixel(current);

        // Skip if positions are nearly identical
        if (Math.abs(sx - cx) < 1 && Math.abs(sy - cy) < 1) return null;

        return (
          <Line
            key={token.id}
            points={[sx, sy, cx, cy]}
            stroke={TRAIL_COLOR}
            strokeWidth={TRAIL_WIDTH}
            opacity={TRAIL_OPACITY}
            dash={TRAIL_DASH}
            lineCap="round"
          />
        );
      })}
    </Layer>
  );
}
