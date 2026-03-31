"use client";

import { Layer, Rect } from "react-konva";
import { useTacticStore } from "@/stores/useTacticStore";
import { FIELD_PADDING } from "@/lib/constants";
import type { Position } from "@/lib/types";
import PlayerToken from "./PlayerToken";
import BallToken from "./BallToken";

interface TokenLayerProps {
  width: number;
  height: number;
  interpolatedPositions?: Record<string, Position> | null;
  isPlaying?: boolean;
}

export default function TokenLayer({
  width,
  height,
  interpolatedPositions,
  isPlaying = false,
}: TokenLayerProps) {
  const tokens = useTacticStore((s) => s.project.tokens);
  const keyframes = useTacticStore((s) => s.project.keyframes);
  const currentKeyframeIndex = useTacticStore((s) => s.currentKeyframeIndex);
  const selectedTokenId = useTacticStore((s) => s.selectedTokenId);
  const dispatch = useTacticStore((s) => s.dispatch);

  const currentPositions =
    interpolatedPositions ?? keyframes[currentKeyframeIndex]?.positions ?? {};

  const p = FIELD_PADDING;
  const fw = width - p * 2;
  const fh = height - p * 2;

  const toPixel = (pos: Position) => ({
    x: p + pos.x * fw,
    y: p + pos.y * fh,
  });

  const handleStageClick = () => {
    dispatch({ type: "SELECT_TOKEN", tokenId: null });
  };

  return (
    <Layer>
      {/* Invisible rect to catch clicks on empty field area */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        onClick={handleStageClick}
        onTap={handleStageClick}
      />

      {tokens.map((token) => {
        const pos = currentPositions[token.id];
        if (!pos) return null;
        const pixel = toPixel(pos);

        if (token.type === "ball") {
          return (
            <BallToken
              key={token.id}
              tokenId={token.id}
              x={pixel.x}
              y={pixel.y}
              isPlaying={isPlaying}
              isSelected={selectedTokenId === token.id}
              fieldWidth={width}
              fieldHeight={height}
            />
          );
        }

        return (
          <PlayerToken
            key={token.id}
            tokenId={token.id}
            team={token.team}
            number={token.number}
            x={pixel.x}
            y={pixel.y}
            isPlaying={isPlaying}
            isSelected={selectedTokenId === token.id}
            fieldWidth={width}
            fieldHeight={height}
          />
        );
      })}
    </Layer>
  );
}
