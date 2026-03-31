"use client";

import { useEffect, useRef } from "react";
import { Layer, Rect, Line, Arc } from "react-konva";
import type Konva from "konva";
import { FIELD_GREEN, FIELD_LINE_COLOR, FIELD_LINE_WIDTH, FIELD_PADDING } from "@/lib/constants";

interface FieldLayerProps {
  width: number;
  height: number;
}

export default function FieldLayer({ width, height }: FieldLayerProps) {
  const layerRef = useRef<Konva.Layer>(null);
  const p = FIELD_PADDING;
  const fw = width - p * 2; // field width
  const fh = height - p * 2; // field height
  const lw = FIELD_LINE_WIDTH;
  const lc = FIELD_LINE_COLOR;

  // Penalty area: ~44% width, ~28% height from top
  const penW = fw * 0.44;
  const penH = fh * 0.28;
  const penX = p + (fw - penW) / 2;
  const penY = p;

  // Goal area: ~22% width, ~12% height from top
  const goalW = fw * 0.22;
  const goalH = fh * 0.12;
  const goalX = p + (fw - goalW) / 2;
  const goalY = p;

  // Center circle arc at bottom
  const arcRadius = Math.min(fw, fh) * 0.12;
  const arcX = p + fw / 2;
  const arcY = p + fh;

  // Penalty spot
  const penSpotX = p + fw / 2;
  const penSpotY = p + fh * 0.18;

  useEffect(() => {
    layerRef.current?.cache();
  }, [width, height]);

  return (
    <Layer ref={layerRef} listening={false}>
      {/* Field background */}
      <Rect x={0} y={0} width={width} height={height} fill={FIELD_GREEN} />

      {/* Outer boundary */}
      <Line
        points={[p, p, p + fw, p, p + fw, p + fh, p, p + fh, p, p]}
        stroke={lc}
        strokeWidth={lw}
        closed
      />

      {/* Penalty area */}
      <Line
        points={[penX, penY, penX, penY + penH, penX + penW, penY + penH, penX + penW, penY]}
        stroke={lc}
        strokeWidth={lw}
      />

      {/* Goal area */}
      <Line
        points={[goalX, goalY, goalX, goalY + goalH, goalX + goalW, goalY + goalH, goalX + goalW, goalY]}
        stroke={lc}
        strokeWidth={lw}
      />

      {/* Center line (bottom of half-court) */}
      <Line points={[p, p + fh, p + fw, p + fh]} stroke={lc} strokeWidth={lw} />

      {/* Center circle arc */}
      <Arc
        x={arcX}
        y={arcY}
        innerRadius={0}
        outerRadius={arcRadius}
        angle={180}
        rotation={180}
        stroke={lc}
        strokeWidth={lw}
        fill="transparent"
      />

      {/* Penalty spot */}
      <Arc
        x={penSpotX}
        y={penSpotY}
        innerRadius={0}
        outerRadius={3}
        angle={360}
        fill={lc}
      />

      {/* Penalty arc */}
      <Arc
        x={penSpotX}
        y={penSpotY}
        innerRadius={0}
        outerRadius={arcRadius}
        angle={120}
        rotation={210}
        stroke={lc}
        strokeWidth={lw}
        fill="transparent"
      />
    </Layer>
  );
}
