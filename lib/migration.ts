import { getDB, getMeta, setMeta } from './db';
import type { TacticProject } from './types';
import { generateId } from './constants';

const MIGRATION_KEY = 'migrated-from-localstorage';
const LEGACY_STORAGE_KEY = 'tacticpad-project';

interface LegacyStorageData {
  state: {
    project: {
      id: string;
      name: string;
      createdAt: string;
      updatedAt: string;
      tokens: unknown[];
      keyframes: unknown[];
    };
    currentKeyframeIndex: number;
  };
}

export async function migrateFromLocalStorage(): Promise<void> {
  // 이미 마이그레이션 완료면 스킵
  const migrated = await getMeta(MIGRATION_KEY);
  if (migrated) return;

  // localStorage에서 읽기
  const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) {
    await setMeta(MIGRATION_KEY, true);
    return;
  }

  try {
    const parsed: LegacyStorageData = JSON.parse(raw);
    const legacy = parsed.state?.project;
    if (!legacy) {
      await setMeta(MIGRATION_KEY, true);
      return;
    }

    // Phase 3 필드 추가하여 TacticProject로 변환
    const project: TacticProject = {
      id: legacy.id || generateId(),
      name: legacy.name || '새 전술',
      createdAt: legacy.createdAt || new Date().toISOString(),
      updatedAt: legacy.updatedAt || new Date().toISOString(),
      tokens: legacy.tokens as TacticProject['tokens'],
      keyframes: legacy.keyframes as TacticProject['keyframes'],
      folderId: null,
      teamId: null,
      userId: null,
      syncStatus: 'local-only',
      deletedAt: null,
    };

    // IndexedDB에 저장
    const db = await getDB();
    await db.put('projects', project);

    // 마이그레이션 완료 기록 (localStorage는 삭제하지 않음 — 안전망)
    await setMeta(MIGRATION_KEY, true);
  } catch (e) {
    console.error('localStorage migration failed:', e);
    // 마이그레이션 실패해도 완료 기록 (무한 재시도 방지)
    await setMeta(MIGRATION_KEY, true);
  }
}
