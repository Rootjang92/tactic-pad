import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { migrateFromLocalStorage } from '@/lib/migration';
import { getDB, getAllProjects, getMeta, resetDB } from '@/lib/db';

beforeEach(() => {
  resetDB();
  indexedDB.deleteDatabase('tacticpad');
  localStorage.clear();
});

describe('migrateFromLocalStorage', () => {
  it('migrates legacy localStorage data to IndexedDB', async () => {
    const legacyData = {
      state: {
        project: {
          id: 'legacy-123',
          name: '레거시 전술',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
          tokens: [
            { id: 't1', type: 'player', team: 'home', number: 1 },
          ],
          keyframes: [
            { id: 'kf1', order: 0, positions: { t1: { x: 0.5, y: 0.5 } } },
          ],
        },
        currentKeyframeIndex: 0,
      },
    };

    localStorage.setItem('tacticpad-project', JSON.stringify(legacyData));

    await migrateFromLocalStorage();

    const projects = await getAllProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe('레거시 전술');
    expect(projects[0].id).toBe('legacy-123');
    expect(projects[0].folderId).toBeNull();
    expect(projects[0].userId).toBeNull();
    expect(projects[0].syncStatus).toBe('local-only');
    expect(projects[0].deletedAt).toBeNull();
  });

  it('skips migration if already done', async () => {
    localStorage.setItem('tacticpad-project', JSON.stringify({
      state: {
        project: {
          id: 'p1', name: 'test', createdAt: '', updatedAt: '',
          tokens: [], keyframes: [],
        },
      },
    }));

    await migrateFromLocalStorage();
    const projects1 = await getAllProjects();
    expect(projects1).toHaveLength(1);

    // 두 번째 호출 — 중복 생성 안 됨
    await migrateFromLocalStorage();
    const projects2 = await getAllProjects();
    expect(projects2).toHaveLength(1);
  });

  it('handles empty localStorage gracefully', async () => {
    await migrateFromLocalStorage();

    const projects = await getAllProjects();
    expect(projects).toHaveLength(0);

    const migrated = await getMeta('migrated-from-localstorage');
    expect(migrated).toBe(true);
  });

  it('handles malformed localStorage data', async () => {
    localStorage.setItem('tacticpad-project', 'not-json');

    await migrateFromLocalStorage();

    const projects = await getAllProjects();
    expect(projects).toHaveLength(0);

    // 마이그레이션 완료 기록 (무한 재시도 방지)
    const migrated = await getMeta('migrated-from-localstorage');
    expect(migrated).toBe(true);
  });

  it('does not delete localStorage after migration (safety net)', async () => {
    localStorage.setItem('tacticpad-project', JSON.stringify({
      state: {
        project: {
          id: 'p1', name: 'test', createdAt: '', updatedAt: '',
          tokens: [], keyframes: [],
        },
      },
    }));

    await migrateFromLocalStorage();

    expect(localStorage.getItem('tacticpad-project')).not.toBeNull();
  });
});
