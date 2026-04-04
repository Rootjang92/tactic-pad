import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { resetDB } from '@/lib/db';
import { createProject, duplicateProject, renameProject, removeProject, getAllProjects } from '@/lib/project-actions';

beforeEach(() => {
  resetDB();
  indexedDB.deleteDatabase('tacticpad');
});

describe('project-actions', () => {
  it('createProject creates a new project with default formation', async () => {
    const project = await createProject();
    expect(project.tokens).toHaveLength(12);
    expect(project.keyframes).toHaveLength(1);
    expect(project.name).toBe('새 전술');
    expect(project.syncStatus).toBe('local-only');

    const all = await getAllProjects();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(project.id);
  });

  it('createProject accepts custom name', async () => {
    const project = await createProject('4-3-3 공격');
    expect(project.name).toBe('4-3-3 공격');
  });

  it('duplicateProject creates a copy with new IDs', async () => {
    const original = await createProject('원본');
    const copy = await duplicateProject(original.id);

    expect(copy).not.toBeNull();
    expect(copy!.id).not.toBe(original.id);
    expect(copy!.name).toBe('원본 (복사본)');
    expect(copy!.tokens).toHaveLength(original.tokens.length);

    // 토큰 ID가 모두 다른지 확인
    const originalIds = new Set(original.tokens.map((t) => t.id));
    for (const token of copy!.tokens) {
      expect(originalIds.has(token.id)).toBe(false);
    }

    // 키프레임 positions의 key가 새 토큰 ID를 사용하는지 확인
    const copyTokenIds = new Set(copy!.tokens.map((t) => t.id));
    const posKeys = Object.keys(copy!.keyframes[0].positions);
    for (const key of posKeys) {
      expect(copyTokenIds.has(key)).toBe(true);
    }

    const all = await getAllProjects();
    expect(all).toHaveLength(2);
  });

  it('duplicateProject returns null for nonexistent project', async () => {
    const result = await duplicateProject('nonexistent');
    expect(result).toBeNull();
  });

  it('renameProject updates project name', async () => {
    const project = await createProject();
    await renameProject(project.id, '새 이름');

    const all = await getAllProjects();
    expect(all[0].name).toBe('새 이름');
  });

  it('removeProject soft-deletes the project', async () => {
    const project = await createProject();
    await removeProject(project.id);

    const all = await getAllProjects();
    expect(all).toHaveLength(0);
  });

  it('multiple projects are sorted by updatedAt descending', async () => {
    const p1 = await createProject('첫 번째');
    // 약간의 시간 차이를 위해 updatedAt을 수동 설정
    const { saveProject, getProject } = await import('@/lib/db');
    const proj1 = await getProject(p1.id);
    proj1!.updatedAt = '2024-01-01T00:00:00.000Z';
    await saveProject(proj1!);

    const p2 = await createProject('두 번째');

    const all = await getAllProjects();
    expect(all[0].name).toBe('두 번째');
    expect(all[1].name).toBe('첫 번째');
  });
});
