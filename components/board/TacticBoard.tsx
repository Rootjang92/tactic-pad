"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import type Konva from "konva";

const Stage = dynamic(() => import("react-konva").then((m) => m.Stage), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        aspectRatio: "1.2",
        background: "#2d8a4e22",
        borderRadius: 4,
        border: "2px dashed #3a3a3a",
      }}
    />
  ),
});

// Dynamic imports for Layer components that use react-konva
const FieldLayer = dynamic(() => import("./FieldLayer"), { ssr: false });
const TokenLayer = dynamic(() => import("./TokenLayer"), { ssr: false });
const TrailLayer = dynamic(() => import("./TrailLayer"), { ssr: false });

interface TacticBoardProps {
  width: number;
  height: number;
}

export default function TacticBoard({ width, height }: TacticBoardProps) {
  const stageRef = useRef<Konva.Stage>(null);

  return (
    <div
      aria-label="전술 보드 캔버스"
      style={{ touchAction: "none", lineHeight: 0 }}
    >
      <Stage ref={stageRef} width={width} height={height}>
        <FieldLayer width={width} height={height} />
        <TrailLayer width={width} height={height} />
        <TokenLayer width={width} height={height} />
      </Stage>
    </div>
  );
}
