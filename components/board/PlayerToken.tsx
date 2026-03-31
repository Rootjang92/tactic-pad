"use client";

import { useRef } from "react";
import { Group, Circle, Text } from "react-konva";
import type Konva from "konva";
import {
  TOKEN_RADIUS,
  HOME_COLOR,
  AWAY_COLOR,
  TOKEN_NUMBER_COLOR,
  TOKEN_SHADOW_REST,
  TOKEN_SHADOW_DRAG,
  TOKEN_DRAG_SCALE,
  FIELD_PADDING,
} from "@/lib/constants";
import { useTacticStore } from "@/stores/useTacticStore";

interface PlayerTokenProps {
  tokenId: string;
  team: "home" | "away";
  number: number;
  x: number;
  y: number;
  isPlaying: boolean;
  isSelected: boolean;
  fieldWidth: number;
  fieldHeight: number;
}

export default function PlayerToken({
  tokenId,
  team,
  number,
  x,
  y,
  isPlaying,
  isSelected,
  fieldWidth,
  fieldHeight,
}: PlayerTokenProps) {
  const groupRef = useRef<Konva.Group>(null);
  const dispatch = useTacticStore((s) => s.dispatch);
  const color = team === "home" ? HOME_COLOR : AWAY_COLOR;
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

  const shadow = isPlaying ? TOKEN_SHADOW_REST : TOKEN_SHADOW_REST;

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
      {/* Selection ring */}
      {isSelected && (
        <Circle
          radius={TOKEN_RADIUS + 4}
          stroke={color}
          strokeWidth={2}
          opacity={0.6}
        />
      )}

      {/* Token circle */}
      <Circle
        radius={TOKEN_RADIUS}
        fill={color}
        shadowColor="black"
        shadowBlur={shadow.blur}
        shadowOffsetX={shadow.offsetX}
        shadowOffsetY={shadow.offsetY}
        shadowOpacity={shadow.opacity}
        hitStrokeWidth={26} // expand hit area to 44px
      />

      {/* Number */}
      <Text
        text={String(number)}
        fontSize={13}
        fontFamily="Geist Sans, sans-serif"
        fill={TOKEN_NUMBER_COLOR}
        fontStyle="600"
        align="center"
        verticalAlign="middle"
        width={TOKEN_RADIUS * 2}
        height={TOKEN_RADIUS * 2}
        offsetX={TOKEN_RADIUS}
        offsetY={TOKEN_RADIUS}
      />
    </Group>
  );
}
