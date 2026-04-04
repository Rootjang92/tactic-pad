import { getAllProjects, getProject, saveProject, deleteProject as softDeleteProject } from './db';
import { createDefaultProject, generateId } from './constants';
import type { TacticProject } from './types';

export async function createProject(name?: string): Promise<TacticProject> {
  const project = createDefaultProject();
  if (name) project.name = name;
  await saveProject(project);
  return project;
}

export async function duplicateProject(sourceId: string): Promise<TacticProject | null> {
  const source = await getProject(sourceId);
  if (!source) return null;

  // ID 리매핑: 새 프로젝트, 새 토큰, 새 키프레임
  const tokenIdMap = new Map<string, string>();
  const newTokens = source.tokens.map((t) => {
    const newId = generateId();
    tokenIdMap.set(t.id, newId);
    return { ...t, id: newId };
  });

  const newKeyframes = source.keyframes.map((kf) => {
    const newPositions: Record<string, { x: number; y: number }> = {};
    for (const [oldId, pos] of Object.entries(kf.positions)) {
      const newId = tokenIdMap.get(oldId) || oldId;
      newPositions[newId] = pos;
    }
    return { ...kf, id: generateId(), positions: newPositions };
  });

  const now = new Date().toISOString();
  const duplicate: TacticProject = {
    ...source,
    id: generateId(),
    name: `${source.name} (복사본)`,
    createdAt: now,
    updatedAt: now,
    tokens: newTokens,
    keyframes: newKeyframes,
    syncStatus: 'local-only',
    deletedAt: null,
  };

  await saveProject(duplicate);
  return duplicate;
}

export async function renameProject(id: string, name: string): Promise<void> {
  const project = await getProject(id);
  if (!project) return;
  project.name = name;
  project.updatedAt = new Date().toISOString();
  await saveProject(project);
}

export async function removeProject(id: string): Promise<void> {
  await softDeleteProject(id);
}

export { getAllProjects };
