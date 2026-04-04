import { useCallback, useEffect, useState } from 'react';
import { getAllProjects } from '@/lib/db';
import type { TacticProject } from '@/lib/types';

export function useProjects() {
  const [projects, setProjects] = useState<TacticProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const list = await getAllProjects();
      setProjects(list);
    } catch (e) {
      console.error('Failed to load projects:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { projects, isLoading, refresh };
}
