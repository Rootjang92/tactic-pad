"use client";

import { useRef } from "react";
import { Group, Circle } from "react-konva";
import type Konva from "konva";
import {
  BALL_RADIUS,
  BALL_COLOR,
  TOKEN_SHADOW_REST,
  TOKEN_DRAG_SCALE,
  FIELD_PADDING,
} from "@/lib/constants";
import { useTacticStore } from "@/stores/useTacticStore";

interface BallTokenProps {
  tokenId: string;
  x: number;
  y: number;
  isPlaying: boolean;
  isSelected: boolean;
  fieldWidth: number;
  fieldHeight: number;
}

export default function BallToken({
  tokenId,
  x,
  y,
  isPlaying,
  isSelected,
  fieldWidth,
  fieldHeight,
}: BallTokenProps) {
  const groupRef = useRef<Konva.Group>(null);
  const dispatch = useTacticStore((s) => s.dispatch);
  const p = FIELD_PADDING;

  const handleDragStart = () => {
    const node = groupRef.current;
    if (!node) return;
    node.to({ scaleX: TOKEN_DRAG_SCALE, scaleY: TOKEN_DRAG_SCALE, duration: 0.1 });
    node.moveToTop();
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = groupRef.current;
    if (!node) return;
    node.to({ scaleX: 1, scaleY: 1, duration: 0.1 });

    const pos = e.target.position();
    dispatch({
      type: "MOVE_TOKEN",
      tokenId,
      position: {
        x: (pos.x - p) / (fieldWidth - p * 2),
        y: (pos.y - p) / (fieldHeight - p * 2),
      },
    });
  };

  const handleClick = () => {
    if (isPlaying) return;
    dispatch({ type: "SELECT_TOKEN", tokenId: isSelected ? null : tokenId });
  };

  return (
    <Group
      ref={groupRef}
      x={x}
      y={y}
      draggable={!isPlaying}
      onClick={handleClick}
      onTap={handleClick}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      dragBoundFunc={(pos) => ({
        x: Math.max(p, Math.min(fieldWidth - p, pos.x)),
        y: Math.max(p, Math.min(fieldHeight - p, pos.y)),
      })}
      opacity={isPlaying ? 0.6 : 1}
    >
      {isSelected && (
        <Circle radius={BALL_RADIUS + 4} stroke={BALL_COLOR} strokeWidth={2} opacity={0.6} />
      )}
      <Circle
        radius={BALL_RADIUS}
        fill={BALL_COLOR}
        shadowColor="black"
        shadowBlur={TOKEN_SHADOW_REST.blur}
        shadowOffsetX={TOKEN_SHADOW_REST.offsetX}
        shadowOffsetY={TOKEN_SHADOW_REST.offsetY}
        shadowOpacity={TOKEN_SHADOW_REST.opacity}
        hitStrokeWidth={34} // expand hit area to 44px
      />
    </Group>
  );
}
