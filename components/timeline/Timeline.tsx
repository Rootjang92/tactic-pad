"use client";

import { useTacticStore } from "@/stores/useTacticStore";
import type { PlaybackControls } from "@/hooks/usePlayback";
import {
  TIMELINE_HEIGHT,
  TIMELINE_BG,
  LABELS,
} from "@/lib/constants";
import KeyframeMarker from "./KeyframeMarker";

interface TimelineProps {
  playback: PlaybackControls;
}

export default function Timeline({ playback }: TimelineProps) {
  const keyframes = useTacticStore((s) => s.project.keyframes);
  const currentKeyframeIndex = useTacticStore((s) => s.currentKeyframeIndex);
  const dispatch = useTacticStore((s) => s.dispatch);

  const canAddKeyframe = keyframes.length < 10;
  const canDeleteKeyframe = keyframes.length > 1;
  const canPlay = keyframes.length >= 2;

  const handleAddKeyframe = () => {
    if (!canAddKeyframe || playback.isPlaying) return;
    dispatch({ type: "ADD_KEYFRAME" });
  };

  const handleDeleteKeyframe = () => {
    if (!canDeleteKeyframe || playback.isPlaying) return;
    dispatch({ type: "DELETE_KEYFRAME", keyframeId: keyframes[currentKeyframeIndex].id });
  };

  const handlePlayPause = () => {
    if (!canPlay) return;
    if (playback.isPlaying) {
      playback.pause();
    } else {
      playback.play();
    }
  };

  return (
    <div
      style={{
        height: TIMELINE_HEIGHT,
        background: TIMELINE_BG,
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        gap: 8,
        borderTop: "1px solid #3a3a3a",
        flexShrink: 0,
      }}
    >
      {/* Play/Pause */}
      <button
        onClick={handlePlayPause}
        disabled={!canPlay}
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "none",
          background: canPlay ? "#2563eb" : "#525252",
          color: "white",
          cursor: canPlay ? "pointer" : "default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          flexShrink: 0,
        }}
        aria-label={playback.isPlaying ? LABELS.pause : LABELS.play}
      >
        {playback.isPlaying ? "⏸" : "▶"}
      </button>

      {/* Keyframe dots */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, overflow: "auto" }}>
        {keyframes.map((kf, i) => (
          <KeyframeMarker
            key={kf.id}
            index={i}
            isActive={
              playback.isPlaying
                ? i <= Math.floor(playback.currentKeyframeProgress)
                : i === currentKeyframeIndex
            }
            isCurrent={i === currentKeyframeIndex}
            onClick={() => playback.seek(i)}
            disabled={playback.isPlaying}
          />
        ))}

        {/* Add keyframe */}
        {canAddKeyframe && !playback.isPlaying && (
          <button
            onClick={handleAddKeyframe}
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              border: "1px dashed #525252",
              background: "transparent",
              color: "#525252",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              flexShrink: 0,
            }}
            aria-label={LABELS.addKeyframe}
          >
            +
          </button>
        )}
      </div>

      {/* Delete keyframe */}
      {canDeleteKeyframe && !playback.isPlaying && (
        <button
          onClick={handleDeleteKeyframe}
          style={{
            height: 28,
            padding: "0 8px",
            borderRadius: 4,
            border: "1px solid #3a3a3a",
            background: "transparent",
            color: "#a1a1aa",
            cursor: "pointer",
            fontSize: 12,
            fontFamily: "var(--font-geist-sans), sans-serif",
            flexShrink: 0,
          }}
          aria-label={LABELS.deleteKeyframe}
        >
          {LABELS.deleteKeyframe}
        </button>
      )}

      {/* Speed toggle */}
      <button
        onClick={playback.cycleSpeed}
        style={{
          height: 28,
          padding: "0 8px",
          borderRadius: 4,
          border: "1px solid #3a3a3a",
          background: "transparent",
          color: "#a1a1aa",
          cursor: "pointer",
          fontSize: 12,
          fontFamily: "var(--font-geist-mono), monospace",
          flexShrink: 0,
        }}
      >
        ×{playback.playbackSpeed}
      </button>
    </div>
  );
}
