import { useState, useRef, useCallback } from "react";
import type { Position } from "@/lib/types";
import { interpolatePositions } from "@/lib/interpolation";
import { KEYFRAME_DURATION_MS } from "@/lib/constants";
import { useTacticStore } from "@/stores/useTacticStore";

export interface PlaybackControls {
  isPlaying: boolean;
  playbackSpeed: 0.5 | 1 | 2;
  interpolatedPositions: Record<string, Position> | null;
  currentKeyframeProgress: number; // 0-based index + fractional progress
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (keyframeIndex: number) => void;
  cycleSpeed: () => void;
}

const SPEED_CYCLE: (0.5 | 1 | 2)[] = [0.5, 1, 2];

export function usePlayback(): PlaybackControls {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.5 | 1 | 2>(1);
  const [interpolatedPositions, setInterpolatedPositions] = useState<Record<string, Position> | null>(null);
  const [currentKeyframeProgress, setCurrentKeyframeProgress] = useState(0);

  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const fromIndexRef = useRef<number>(0);

  const cancelAnimation = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const play = useCallback(() => {
    const store = useTacticStore.getState();
    const { keyframes } = store.project;
    if (keyframes.length < 2) return;

    setIsPlaying(true);
    fromIndexRef.current = 0;
    startTimeRef.current = performance.now();

    // Move to first keyframe
    store.dispatch({ type: "SELECT_KEYFRAME", index: 0 });
    store.dispatch({ type: "SELECT_TOKEN", tokenId: null });

    const animate = (now: number) => {
      const { project } = useTacticStore.getState();
      const speed = useTacticStore.getState() as unknown as { playbackSpeed?: number };
      // Read speed from local state via closure isn't reactive, use ref pattern instead
      const currentSpeed = playbackSpeed;
      const duration = KEYFRAME_DURATION_MS / currentSpeed;
      const elapsed = now - startTimeRef.current;
      const fromIdx = fromIndexRef.current;
      const toIdx = fromIdx + 1;

      if (toIdx >= project.keyframes.length) {
        // Animation complete
        setIsPlaying(false);
        setInterpolatedPositions(null);
        setCurrentKeyframeProgress(project.keyframes.length - 1);
        useTacticStore.getState().dispatch({ type: "SELECT_KEYFRAME", index: project.keyframes.length - 1 });
        return;
      }

      const progress = Math.min(1, elapsed / duration);
      const fromPositions = project.keyframes[fromIdx].positions;
      const toPositions = project.keyframes[toIdx].positions;
      const interpolated = interpolatePositions(fromPositions, toPositions, progress);

      setInterpolatedPositions(interpolated);
      setCurrentKeyframeProgress(fromIdx + progress);

      if (progress >= 1) {
        // Move to next keyframe transition
        fromIndexRef.current = toIdx;
        startTimeRef.current = now;
        useTacticStore.getState().dispatch({ type: "SELECT_KEYFRAME", index: toIdx });
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    cancelAnimation();
    rafRef.current = requestAnimationFrame(animate);
  }, [cancelAnimation, playbackSpeed]);

  const pause = useCallback(() => {
    cancelAnimation();
    setIsPlaying(false);
    // Keep interpolated positions visible
  }, [cancelAnimation]);

  const stop = useCallback(() => {
    cancelAnimation();
    setIsPlaying(false);
    setInterpolatedPositions(null);
    setCurrentKeyframeProgress(0);
    useTacticStore.getState().dispatch({ type: "SELECT_KEYFRAME", index: 0 });
  }, [cancelAnimation]);

  const seek = useCallback((keyframeIndex: number) => {
    cancelAnimation();
    setIsPlaying(false);
    setInterpolatedPositions(null);
    setCurrentKeyframeProgress(keyframeIndex);
    useTacticStore.getState().dispatch({ type: "SELECT_KEYFRAME", index: keyframeIndex });
  }, [cancelAnimation]);

  const cycleSpeed = useCallback(() => {
    setPlaybackSpeed((prev) => {
      const idx = SPEED_CYCLE.indexOf(prev);
      return SPEED_CYCLE[(idx + 1) % SPEED_CYCLE.length];
    });
  }, []);

  return {
    isPlaying,
    playbackSpeed,
    interpolatedPositions,
    currentKeyframeProgress,
    play,
    pause,
    stop,
    seek,
    cycleSpeed,
  };
}
