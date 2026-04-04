"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";
import { migrateFromLocalStorage } from "@/lib/migration";
import { createProject, duplicateProject, renameProject, removeProject } from "@/lib/project-actions";
import ProjectList from "@/components/projects/ProjectList";
import { APP_BG, TOOLBAR_HEIGHT, TOOLBAR_BG } from "@/lib/constants";

export default function Home() {
  const router = useRouter();
  const { projects, isLoading, refresh } = useProjects();
  const [migrated, setMigrated] = useState(false);

  // 첫 로드 시 마이그레이션 실행
  useEffect(() => {
    (async () => {
      await migrateFromLocalStorage();
      setMigrated(true);
      refresh();
    })();
  }, [refresh]);

  const handleOpen = (id: string) => {
    router.push(`/project/${id}`);
  };

  const handleCreate = async () => {
    const project = await createProject();
    router.push(`/project/${project.id}`);
  };

  const handleDuplicate = async (id: string) => {
    await duplicateProject(id);
    refresh();
  };

  const handleRename = async (id: string, name: string) => {
    await renameProject(id, name);
    refresh();
  };

  const handleDelete = async (id: string) => {
    await removeProject(id);
    refresh();
  };

  if (!migrated || isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: APP_BG }}>
        <span style={{ color: "#71717a", fontSize: 14 }}>로딩 중...</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: APP_BG }}>
      {/* 헤더 */}
      <div
        style={{
          height: TOOLBAR_HEIGHT,
          background: TOOLBAR_BG,
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          borderBottom: "1px solid #3a3a3a",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>TacticPad</span>
        <span style={{ fontSize: 12, color: "#71717a" }}>전술 보드</span>
      </div>

      {/* 프로젝트 목록 */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: "#fff", margin: 0 }}>
            내 전술
            <span style={{ fontSize: 13, color: "#71717a", fontWeight: 400, marginLeft: 8 }}>
              {projects.length}개
            </span>
          </h1>
        </div>

        <ProjectList
          projects={projects}
          onOpen={handleOpen}
          onCreate={handleCreate}
          onDuplicate={handleDuplicate}
          onRename={handleRename}
          onDelete={handleDelete}
        />

        {projects.length === 0 && (
          <div style={{ textAlign: "center", marginTop: 60, color: "#52525b" }}>
            <p style={{ fontSize: 14, marginBottom: 8 }}>아직 전술이 없습니다</p>
            <p style={{ fontSize: 13 }}>위의 + 버튼으로 새 전술을 만들어보세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
