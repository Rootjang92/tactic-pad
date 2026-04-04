import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { TacticProject, Folder, Team, SyncQueueItem } from './types';

interface TacticPadDB extends DBSchema {
  projects: {
    key: string;
    value: TacticProject;
    indexes: {
      'by-folder': string;
      'by-updated': string;
      'by-sync': string;
    };
  };
  folders: {
    key: string;
    value: Folder;
    indexes: {
      'by-parent': string;
    };
  };
  teams: {
    key: string;
    value: Team;
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-status': string;
      'by-timestamp': string;
    };
  };
  meta: {
    key: string;
    value: { key: string; value: unknown };
  };
}

let dbInstance: IDBPDatabase<TacticPadDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<TacticPadDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<TacticPadDB>('tacticpad', 1, {
    upgrade(db) {
      // projects store
      const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
      projectStore.createIndex('by-folder', 'folderId');
      projectStore.createIndex('by-updated', 'updatedAt');
      projectStore.createIndex('by-sync', 'syncStatus');

      // folders store
      const folderStore = db.createObjectStore('folders', { keyPath: 'id' });
      folderStore.createIndex('by-parent', 'parentId');

      // teams store
      db.createObjectStore('teams', { keyPath: 'id' });

      // syncQueue store
      const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
      syncStore.createIndex('by-status', 'status');
      syncStore.createIndex('by-timestamp', 'timestamp');

      // meta store
      db.createObjectStore('meta', { keyPath: 'key' });
    },
  });

  return dbInstance;
}

// Project CRUD
export async function getAllProjects(): Promise<TacticProject[]> {
  const db = await getDB();
  const projects = await db.getAll('projects');
  return projects.filter((p) => p.deletedAt === null).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
}

export async function getProject(id: string): Promise<TacticProject | undefined> {
  const db = await getDB();
  return db.get('projects', id);
}

export async function saveProject(project: TacticProject): Promise<void> {
  const db = await getDB();
  await db.put('projects', project);
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  const project = await db.get('projects', id);
  if (project) {
    project.deletedAt = new Date().toISOString();
    project.updatedAt = new Date().toISOString();
    await db.put('projects', project);
  }
}

// Meta helpers
export async function getMeta(key: string): Promise<unknown> {
  const db = await getDB();
  const row = await db.get('meta', key);
  return row?.value;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put('meta', { key, value });
}

// Reset (for testing)
export function resetDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
