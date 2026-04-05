"use client";

import { useState } from "react";
import type { TacticProject } from "@/lib/types";
import { FIELD_GREEN } from "@/lib/constants";

interface ProjectCardProps {
  project: TacticProject;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export default function ProjectCard({ project, onOpen, onDuplicate, onRename, onDelete }: ProjectCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [showMenu, setShowMenu] = useState(false);

  const tokenCount = project.tokens.filter((t) => t.type === "player").length;
  const keyframeCount = project.keyframes.length;
  const updatedAt = new Date(project.updatedAt);
  const timeAgo = formatTimeAgo(updatedAt);

  const handleRename = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== project.name) {
      onRename(project.id, trimmed);
    } else {
      setEditName(project.name);
    }
    setIsEditing(false);
  };

  return (
    <>
    {/* 메뉴 바깥 클릭 시 닫기 */}
    {showMenu && (
      <div
        style={{ position: "fixed", inset: 0, zIndex: 20 }}
        onClick={() => setShowMenu(false)}
      />
    )}
    <div
      style={{
        background: "#242424",
        borderRadius: 12,
        border: "1px solid #3a3a3a",
        cursor: "pointer",
        transition: "border-color 150ms",
        position: "relative",
        zIndex: showMenu ? 21 : undefined,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#525252")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#3a3a3a")}
    >
      {/* 미니 필드 미리보기 */}
      <div
        onClick={() => onOpen(project.id)}
        style={{
          aspectRatio: "1.2",
          background: FIELD_GREEN,
          position: "relative",
          borderBottom: "1px solid #3a3a3a",
          borderRadius: "12px 12px 0 0",
          overflow: "hidden",
        }}
      >
        {/* 토큰 미리보기 점 */}
        {project.keyframes[0] &&
          project.tokens.slice(0, 12).map((token) => {
            const pos = project.keyframes[0].positions[token.id];
            if (!pos) return null;
            return (
              <div
                key={token.id}
                style={{
                  position: "absolute",
                  left: `${pos.x * 100}%`,
                  top: `${pos.y * 100}%`,
                  width: token.type === "ball" ? 6 : 8,
                  height: token.type === "ball" ? 6 : 8,
                  borderRadius: "50%",
                  background:
                    token.type === "ball"
                      ? "#fbbf24"
                      : token.team === "home"
                        ? "#2563eb"
                        : "#dc2626",
                  transform: "translate(-50%, -50%)",
                }}
              />
            );
          })}
      </div>

      {/* 카드 하단 정보 */}
      <div style={{ padding: "10px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {isEditing ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") {
                  setEditName(project.name);
                  setIsEditing(false);
                }
              }}
              style={{
                background: "transparent",
                border: "1px solid #525252",
                borderRadius: 4,
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                padding: "2px 6px",
                outline: "none",
                width: "100%",
                fontFamily: "inherit",
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              style={{ fontSize: 14, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}
              onClick={() => onOpen(project.id)}
            >
              {project.name}
            </span>
          )}

          {/* 메뉴 버튼 */}
          <div style={{ position: "relative", marginLeft: 4 }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              style={{
                background: "transparent",
                border: "none",
                color: "#71717a",
                cursor: "pointer",
                padding: "4px 6px",
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              ⋯
            </button>
            {showMenu && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "100%",
                  background: "#2a2a2a",
                  border: "1px solid #3a3a3a",
                  borderRadius: 8,
                  padding: 4,
                  zIndex: 22,
                  minWidth: 120,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <MenuItem label="이름 변경" onClick={() => { setIsEditing(true); setShowMenu(false); }} />
                <MenuItem label="복제" onClick={() => { onDuplicate(project.id); setShowMenu(false); }} />
                <MenuItem label="삭제" onClick={() => { onDelete(project.id); setShowMenu(false); }} danger />
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 6, fontSize: 12, color: "#71717a" }}>
          <span>{tokenCount}명</span>
          <span>·</span>
          <span>{keyframeCount}프레임</span>
          <span>·</span>
          <span>{timeAgo}</span>
        </div>
      </div>

    </div>
    </>
  );
}

function MenuItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        background: "transparent",
        border: "none",
        color: danger ? "#ef4444" : "#d4d4d8",
        padding: "8px 12px",
        fontSize: 13,
        cursor: "pointer",
        borderRadius: 4,
        fontFamily: "inherit",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#3a3a3a")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {label}
    </button>
  );
}

function formatTimeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  return date.toLocaleDateString("ko-KR");
}
