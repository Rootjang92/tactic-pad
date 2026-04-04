import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { getDB, getAllProjects, getProject, saveProject, deleteProject, getMeta, setMeta, resetDB } from '@/lib/db';
import { createDefaultProject } from '@/lib/constants';

beforeEach(() => {
  resetDB();
  indexedDB.deleteDatabase('tacticpad');
});

describe('IndexedDB operations', () => {
  it('creates database with correct stores', async () => {
    const db = await getDB();
    expect(db.objectStoreNames).toContain('projects');
    expect(db.objectStoreNames).toContain('folders');
    expect(db.objectStoreNames).toContain('teams');
    expect(db.objectStoreNames).toContain('syncQueue');
    expect(db.objectStoreNames).toContain('meta');
  });

  it('saves and retrieves a project', async () => {
    const project = createDefaultProject();
    await saveProject(project);

    const retrieved = await getProject(project.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(project.id);
    expect(retrieved!.name).toBe(project.name);
    expect(retrieved!.tokens).toHaveLength(12);
  });

  it('getAllProjects excludes soft-deleted projects', async () => {
    const p1 = createDefaultProject();
    const p2 = createDefaultProject();
    p2.deletedAt = new Date().toISOString();

    await saveProject(p1);
    await saveProject(p2);

    const projects = await getAllProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0].id).toBe(p1.id);
  });

  it('getAllProjects sorts by updatedAt descending', async () => {
    const p1 = createDefaultProject();
    p1.updatedAt = '2024-01-01T00:00:00.000Z';
    const p2 = createDefaultProject();
    p2.updatedAt = '2024-06-01T00:00:00.000Z';

    await saveProject(p1);
    await saveProject(p2);

    const projects = await getAllProjects();
    expect(projects[0].id).toBe(p2.id);
    expect(projects[1].id).toBe(p1.id);
  });

  it('deleteProject soft-deletes by setting deletedAt', async () => {
    const project = createDefaultProject();
    await saveProject(project);
    await deleteProject(project.id);

    const all = await getAllProjects();
    expect(all).toHaveLength(0);

    // 실제로는 DB에 남아있음 (soft delete)
    const raw = await getProject(project.id);
    expect(raw).toBeDefined();
    expect(raw!.deletedAt).not.toBeNull();
  });

  it('meta store reads and writes', async () => {
    await setMeta('test-key', { foo: 'bar' });
    const val = await getMeta('test-key');
    expect(val).toEqual({ foo: 'bar' });
  });

  it('getMeta returns undefined for missing key', async () => {
    const val = await getMeta('nonexistent');
    expect(val).toBeUndefined();
  });
});
