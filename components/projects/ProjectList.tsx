"use client";

import type { TacticProject } from "@/lib/types";
import ProjectCard from "./ProjectCard";

interface ProjectListProps {
  projects: TacticProject[];
  onOpen: (id: string) => void;
  onCreate: () => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export default function ProjectList({ projects, onOpen, onCreate, onDuplicate, onRename, onDelete }: ProjectListProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 16,
      }}
    >
      {/* 새 프로젝트 카드 */}
      <button
        onClick={onCreate}
        style={{
          aspectRatio: "auto",
          minHeight: 180,
          background: "transparent",
          borderRadius: 12,
          border: "2px dashed #3a3a3a",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          color: "#71717a",
          fontSize: 14,
          fontFamily: "inherit",
          transition: "border-color 150ms, color 150ms",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#525252"; e.currentTarget.style.color = "#a1a1aa"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#3a3a3a"; e.currentTarget.style.color = "#71717a"; }}
      >
        <span style={{ fontSize: 28, lineHeight: 1 }}>+</span>
        <span>새 전술</span>
      </button>

      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onOpen={onOpen}
          onDuplicate={onDuplicate}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
