import { create } from 'zustand';
import type { ProjectState, ProjectAction, TacticProject, Keyframe } from '@/lib/types';
import { generateId, createDefaultProject, MAX_KEYFRAMES, MAX_TOKENS, MAX_UNDO_HISTORY } from '@/lib/constants';

interface TacticStore extends ProjectState {
  // undo/redo
  undoStack: ProjectState[];
  redoStack: ProjectState[];

  // actions
  dispatch: (action: ProjectAction) => void;
  undo: () => void;
  redo: () => void;
  loadProject: (project: TacticProject) => void;
}

function applyAction(state: ProjectState, action: ProjectAction): ProjectState {
  const { project, currentKeyframeIndex } = state;
  const currentKeyframe = project.keyframes[currentKeyframeIndex];

  switch (action.type) {
    case 'MOVE_TOKEN': {
      const newKeyframes = project.keyframes.map((kf) =>
        kf.id === currentKeyframe.id
          ? { ...kf, positions: { ...kf.positions, [action.tokenId]: action.position } }
          : kf
      );
      return {
        ...state,
        project: { ...project, keyframes: newKeyframes, updatedAt: new Date().toISOString() },
      };
    }

    case 'ADD_TOKEN': {
      if (project.tokens.length >= MAX_TOKENS) return state;
      const newTokens = [...project.tokens, action.token];
      const newKeyframes = project.keyframes.map((kf) => ({
        ...kf,
        positions: { ...kf.positions, [action.token.id]: action.position },
      }));
      return {
        ...state,
        project: { ...project, tokens: newTokens, keyframes: newKeyframes, updatedAt: new Date().toISOString() },
      };
    }

    case 'REMOVE_TOKEN': {
      const newTokens = project.tokens.filter((t) => t.id !== action.tokenId);
      const newKeyframes = project.keyframes.map((kf) => {
        const { [action.tokenId]: _, ...rest } = kf.positions;
        return { ...kf, positions: rest };
      });
      return {
        ...state,
        project: { ...project, tokens: newTokens, keyframes: newKeyframes, updatedAt: new Date().toISOString() },
        selectedTokenId: state.selectedTokenId === action.tokenId ? null : state.selectedTokenId,
      };
    }

    case 'ADD_KEYFRAME': {
      if (project.keyframes.length >= MAX_KEYFRAMES) return state;
      const newKeyframe: Keyframe = {
        id: generateId(),
        order: project.keyframes.length,
        positions: { ...currentKeyframe.positions },
      };
      return {
        ...state,
        project: { ...project, keyframes: [...project.keyframes, newKeyframe], updatedAt: new Date().toISOString() },
        currentKeyframeIndex: project.keyframes.length,
      };
    }

    case 'DELETE_KEYFRAME': {
      if (project.keyframes.length <= 1) return state;
      const filtered = project.keyframes
        .filter((kf) => kf.id !== action.keyframeId)
        .map((kf, i) => ({ ...kf, order: i }));
      const newIndex = Math.min(currentKeyframeIndex, filtered.length - 1);
      return {
        ...state,
        project: { ...project, keyframes: filtered, updatedAt: new Date().toISOString() },
        currentKeyframeIndex: newIndex,
      };
    }

    case 'SELECT_KEYFRAME': {
      if (action.index < 0 || action.index >= project.keyframes.length) return state;
      return { ...state, currentKeyframeIndex: action.index };
    }

    case 'SELECT_TOKEN': {
      return { ...state, selectedTokenId: action.tokenId };
    }

    case 'LOAD_PROJECT': {
      return { project: action.project, currentKeyframeIndex: 0, selectedTokenId: null };
    }

    case 'CLEAR': {
      return { project: createDefaultProject(), currentKeyframeIndex: 0, selectedTokenId: null };
    }

    case 'SET_NAME': {
      return {
        ...state,
        project: { ...project, name: action.name, updatedAt: new Date().toISOString() },
      };
    }

    default:
      return state;
  }
}

function getProjectState(store: TacticStore): ProjectState {
  return {
    project: store.project,
    currentKeyframeIndex: store.currentKeyframeIndex,
    selectedTokenId: store.selectedTokenId,
  };
}

export const useTacticStore = create<TacticStore>()(
  (set, get) => {
    const defaultProject = createDefaultProject();
    return {
      // state
      project: defaultProject,
      currentKeyframeIndex: 0,
      selectedTokenId: null,
      undoStack: [],
      redoStack: [],

      dispatch: (action: ProjectAction) => {
        const store = get();
        const current = getProjectState(store);
        const next = applyAction(current, action);

        // Don't track selection/navigation/load in undo
        const trackable = action.type !== 'SELECT_TOKEN'
          && action.type !== 'SELECT_KEYFRAME'
          && action.type !== 'LOAD_PROJECT';

        if (trackable) {
          const undoStack = [...store.undoStack, current];
          set({
            ...next,
            undoStack: undoStack.length > MAX_UNDO_HISTORY ? undoStack.slice(-MAX_UNDO_HISTORY) : undoStack,
            redoStack: [],
          });
        } else {
          set(next);
        }
      },

      loadProject: (project: TacticProject) => {
        set({
          project,
          currentKeyframeIndex: 0,
          selectedTokenId: null,
          undoStack: [],
          redoStack: [],
        });
      },

      undo: () => {
        const store = get();
        if (store.undoStack.length === 0) return;
        const prev = store.undoStack[store.undoStack.length - 1];
        set({
          ...prev,
          undoStack: store.undoStack.slice(0, -1),
          redoStack: [...store.redoStack, getProjectState(store)],
        });
      },

      redo: () => {
        const store = get();
        if (store.redoStack.length === 0) return;
        const next = store.redoStack[store.redoStack.length - 1];
        set({
          ...next,
          undoStack: [...store.undoStack, getProjectState(store)],
          redoStack: store.redoStack.slice(0, -1),
        });
      },
    };
  }
);
