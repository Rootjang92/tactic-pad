"use client";

import { useState } from "react";
import { useTacticStore } from "@/stores/useTacticStore";
import {
  TOOLBAR_HEIGHT,
  TOOLBAR_BG,
  LABELS,
  HOME_COLOR,
  AWAY_COLOR,
  MAX_PLAYERS_PER_TEAM,
  generateId,
} from "@/lib/constants";
import type { Token } from "@/lib/types";

interface ToolbarProps {
  isPlaying: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  saveStatus: "idle" | "saving" | "saved" | "error";
  projectName?: string;
  onBack?: () => void;
}

export default function Toolbar({ isPlaying, canUndo, canRedo, onUndo, onRedo, saveStatus, projectName, onBack }: ToolbarProps) {
  const dispatch = useTacticStore((s) => s.dispatch);
  const tokens = useTacticStore((s) => s.project.tokens);
  const [showConfirm, setShowConfirm] = useState(false);

  const homeCount = tokens.filter((t) => t.type === "player" && t.team === "home").length;
  const awayCount = tokens.filter((t) => t.type === "player" && t.team === "away").length;
  const hasBall = tokens.some((t) => t.type === "ball");

  const nextNumber = (team: "home" | "away") => {
    const used = new Set(tokens.filter((t) => t.team === team && t.type === "player").map((t) => t.number));
    for (let i = 1; i <= MAX_PLAYERS_PER_TEAM; i++) {
      if (!used.has(i)) return i;
    }
    return MAX_PLAYERS_PER_TEAM;
  };

  const addPlayer = (team: "home" | "away") => {
    const count = team === "home" ? homeCount : awayCount;
    if (count >= MAX_PLAYERS_PER_TEAM || isPlaying) return;
    const token: Token = { id: generateId(), type: "player", team, number: nextNumber(team) };
    dispatch({ type: "ADD_TOKEN", token, position: { x: 0.5, y: 0.5 } });
  };

  const addBall = () => {
    if (hasBall || isPlaying) return;
    const token: Token = { id: generateId(), type: "ball", team: "home", number: 0 };
    dispatch({ type: "ADD_TOKEN", token, position: { x: 0.5, y: 0.85 } });
  };

  const handleClear = () => {
    if (isPlaying) return;
    setShowConfirm(true);
  };

  const confirmClear = () => {
    dispatch({ type: "CLEAR" });
    setShowConfirm(false);
  };

  const btnBase: React.CSSProperties = {
    height: 32,
    padding: "0 10px",
    borderRadius: 6,
    border: "1px solid #3a3a3a",
    background: "transparent",
    color: "#a1a1aa",
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "inherit",
    minWidth: 44,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    whiteSpace: "nowrap",
  };

  return (
    <>
      <div
        style={{
          height: TOOLBAR_HEIGHT,
          background: TOOLBAR_BG,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 6,
          borderBottom: "1px solid #3a3a3a",
          flexShrink: 0,
          overflowX: "auto",
        }}
      >
        {/* Back button + project name */}
        {onBack && (
          <button style={{ ...btnBase, padding: "0 8px" }} onClick={onBack}>
            ←
          </button>
        )}
        {projectName && (
          <span style={{ fontSize: 13, color: "#a1a1aa", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>
            {projectName}
          </span>
        )}

        {onBack && <div style={{ width: 1, height: 20, background: "#3a3a3a" }} />}

        {/* Add tokens */}
        <button
          style={{ ...btnBase, borderColor: HOME_COLOR, color: HOME_COLOR }}
          onClick={() => addPlayer("home")}
          disabled={homeCount >= MAX_PLAYERS_PER_TEAM || isPlaying}
        >
          {LABELS.addHomePlayer}
        </button>
        <button
          style={{ ...btnBase, borderColor: AWAY_COLOR, color: AWAY_COLOR }}
          onClick={() => addPlayer("away")}
          disabled={awayCount >= MAX_PLAYERS_PER_TEAM || isPlaying}
        >
          {LABELS.addAwayPlayer}
        </button>
        <button
          style={btnBase}
          onClick={addBall}
          disabled={hasBall || isPlaying}
        >
          {LABELS.addBall}
        </button>

        <div style={{ flex: 1 }} />

        {/* Save indicator */}
        {saveStatus === "saved" && (
          <span style={{ color: "#22c55e", fontSize: 13, transition: "opacity 500ms", marginRight: 4 }}>✓</span>
        )}

        {/* Undo/Redo */}
        <button style={btnBase} onClick={onUndo} disabled={!canUndo || isPlaying}>
          ↩
        </button>
        <button style={btnBase} onClick={onRedo} disabled={!canRedo || isPlaying}>
          ↪
        </button>

        {/* Clear */}
        <button
          style={{ ...btnBase, color: "#ef4444", borderColor: "#ef444433" }}
          onClick={handleClear}
          disabled={isPlaying}
        >
          {LABELS.clear}
        </button>
      </div>

      {/* Confirm dialog */}
      {showConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            style={{
              background: "#242424",
              borderRadius: 12,
              padding: "24px 32px",
              border: "1px solid #3a3a3a",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ fontSize: 16, marginBottom: 20 }}>{LABELS.confirmClear}</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                style={{ ...btnBase, height: 36, background: "#ef4444", color: "white", border: "none" }}
                onClick={confirmClear}
              >
                {LABELS.confirm}
              </button>
              <button
                style={{ ...btnBase, height: 36 }}
                onClick={() => setShowConfirm(false)}
              >
                {LABELS.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
