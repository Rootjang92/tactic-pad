"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useCanvasSize } from "@/hooks/useCanvasSize";
import { usePlayback } from "@/hooks/usePlayback";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useTacticStore } from "@/stores/useTacticStore";
import Toolbar from "@/components/controls/Toolbar";
import Timeline from "@/components/timeline/Timeline";
import Toast from "@/components/Toast";
import { LABELS, APP_BG } from "@/lib/constants";
import { getProject } from "@/lib/db";

const TacticBoard = dynamic(() => import("@/components/board/TacticBoard"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: APP_BG,
      }}
    >
      <div
        style={{
          width: "80%",
          aspectRatio: "1.2",
          background: "#2d8a4e22",
          borderRadius: 4,
          border: "2px dashed #3a3a3a",
        }}
      />
    </div>
  ),
});

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useCanvasSize(containerRef);
  const playback = usePlayback();
  const saveStatus = useAutoSave();
  const undo = useTacticStore((s) => s.undo);
  const redo = useTacticStore((s) => s.redo);
  const undoStack = useTacticStore((s) => s.undoStack);
  const redoStack = useTacticStore((s) => s.redoStack);
  const selectedTokenId = useTacticStore((s) => s.selectedTokenId);
  const dispatch = useTacticStore((s) => s.dispatch);

  const [isLoaded, setIsLoaded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem("tacticpad-tooltip-seen");
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // IndexedDB에서 프로젝트 로드
  useEffect(() => {
    if (!params.id) return;
    (async () => {
      try {
        const project = await getProject(params.id);
        if (project && !project.deletedAt) {
          useTacticStore.getState().loadProject(project);
          setIsLoaded(true);
        } else {
          router.replace("/");
        }
      } catch (e) {
        console.error("Failed to load project:", e);
        router.replace("/");
      }
    })();
  }, [params.id, router]);

  // First-run tooltip auto-hide
  useEffect(() => {
    if (!showTooltip) return;
    const timer = setTimeout(() => {
      setShowTooltip(false);
      localStorage.setItem("tacticpad-tooltip-seen", "1");
    }, 3000);
    return () => clearTimeout(timer);
  }, [showTooltip]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        undo();
      } else if (e.key === " ") {
        e.preventDefault();
        if (playback.isPlaying) playback.pause();
        else playback.play();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedTokenId && !playback.isPlaying) {
          dispatch({ type: "REMOVE_TOKEN", tokenId: selectedTokenId });
        }
      }
    },
    [undo, redo, playback, selectedTokenId, dispatch],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: APP_BG,
        overflow: "hidden",
      }}
    >
      {/* Toolbar */}
      <Toolbar
        isPlaying={playback.isPlaying}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={undo}
        onRedo={redo}
        saveStatus={saveStatus}
        projectName={isLoaded ? useTacticStore.getState().project.name : undefined}
        onBack={() => router.push("/")}
      />

      {/* Canvas container — 항상 렌더하여 containerRef 유지 */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {!isLoaded ? (
          <span style={{ color: "#71717a", fontSize: 14 }}>로딩 중...</span>
        ) : (
          <>
            {width > 0 && height > 0 && (
              <TacticBoard
                width={width}
                height={height}
                isPlaying={playback.isPlaying}
                interpolatedPositions={playback.interpolatedPositions}
              />
            )}

            {/* First-run tooltip */}
            {showTooltip && (
              <div
                style={{
                  position: "absolute",
                  bottom: 16,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(0,0,0,0.75)",
                  color: "#a1a1aa",
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontSize: 13,
                  pointerEvents: "none",
                  transition: "opacity 500ms",
                }}
              >
                {LABELS.firstRunTooltip}
              </div>
            )}
          </>
        )}
      </div>

      {/* Timeline */}
      <Timeline playback={playback} />

      {/* Toast */}
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  );
}
