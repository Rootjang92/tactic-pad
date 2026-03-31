"use client";

import { KEYFRAME_DOT_RADIUS, KEYFRAME_DOT_COLOR, KEYFRAME_DOT_ACTIVE, MIN_TOUCH_TARGET } from "@/lib/constants";

interface KeyframeMarkerProps {
  index: number;
  isActive: boolean;
  isCurrent: boolean;
  onClick: () => void;
  disabled: boolean;
}

export default function KeyframeMarker({ index, isActive, isCurrent, onClick, disabled }: KeyframeMarkerProps) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        width: MIN_TOUCH_TARGET,
        height: MIN_TOUCH_TARGET,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "none",
        cursor: disabled ? "default" : "pointer",
        padding: 0,
        flexShrink: 0,
      }}
      aria-label={`키프레임 ${index + 1}`}
    >
      <div
        style={{
          width: KEYFRAME_DOT_RADIUS * 2,
          height: KEYFRAME_DOT_RADIUS * 2,
          borderRadius: "50%",
          background: isActive ? KEYFRAME_DOT_ACTIVE : KEYFRAME_DOT_COLOR,
          transition: "transform 200ms ease-out, background 150ms",
          transform: isCurrent ? "scale(1.3)" : "scale(1)",
        }}
      />
    </button>
  );
}
