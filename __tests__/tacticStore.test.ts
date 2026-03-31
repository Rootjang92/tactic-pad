import { describe, it, expect, beforeEach } from 'vitest';
import { useTacticStore } from '@/stores/useTacticStore';
import { createDefaultProject, generateId, MAX_KEYFRAMES, MAX_TOKENS } from '@/lib/constants';
import type { Token, Position } from '@/lib/types';

beforeEach(() => {
  // Reset store to default state before each test
  useTacticStore.setState({
    project: createDefaultProject(),
    currentKeyframeIndex: 0,
    selectedTokenId: null,
    undoStack: [],
    redoStack: [],
  });
});

function getState() {
  return useTacticStore.getState();
}

describe('tacticStore', () => {
  it('initializes with default 4-4-2 formation (11 players + 1 ball)', () => {
    const { project } = getState();
    expect(project.tokens).toHaveLength(12);
    expect(project.keyframes).toHaveLength(1);
    expect(project.tokens.filter((t) => t.type === 'player')).toHaveLength(11);
    expect(project.tokens.filter((t) => t.type === 'ball')).toHaveLength(1);
  });

  it('MOVE_TOKEN updates position in current keyframe', () => {
    const tokenId = getState().project.tokens[0].id;
    const newPos: Position = { x: 0.3, y: 0.4 };

    getState().dispatch({ type: 'MOVE_TOKEN', tokenId, position: newPos });

    const kf = getState().project.keyframes[0];
    expect(kf.positions[tokenId]).toEqual(newPos);
  });

  it('ADD_TOKEN adds token to all keyframes', () => {
    const newToken: Token = { id: generateId(), type: 'player', team: 'away', number: 1 };
    const pos: Position = { x: 0.5, y: 0.5 };

    getState().dispatch({ type: 'ADD_TOKEN', token: newToken, position: pos });

    expect(getState().project.tokens).toHaveLength(13);
    expect(getState().project.keyframes[0].positions[newToken.id]).toEqual(pos);
  });

  it('ADD_TOKEN enforces max tokens limit', () => {
    for (let i = 0; i < 11; i++) {
      const token: Token = { id: generateId(), type: 'player', team: 'away', number: i + 1 };
      getState().dispatch({ type: 'ADD_TOKEN', token, position: { x: 0.5, y: 0.5 } });
    }
    expect(getState().project.tokens).toHaveLength(MAX_TOKENS);

    const extra: Token = { id: generateId(), type: 'player', team: 'away', number: 12 };
    getState().dispatch({ type: 'ADD_TOKEN', token: extra, position: { x: 0.5, y: 0.5 } });
    expect(getState().project.tokens).toHaveLength(MAX_TOKENS);
  });

  it('REMOVE_TOKEN removes from all keyframes and deselects if selected', () => {
    const tokenId = getState().project.tokens[0].id;

    getState().dispatch({ type: 'SELECT_TOKEN', tokenId });
    expect(getState().selectedTokenId).toBe(tokenId);

    getState().dispatch({ type: 'REMOVE_TOKEN', tokenId });
    expect(getState().project.tokens.find((t) => t.id === tokenId)).toBeUndefined();
    expect(getState().project.keyframes[0].positions[tokenId]).toBeUndefined();
    expect(getState().selectedTokenId).toBeNull();
  });

  it('ADD_KEYFRAME copies positions from current keyframe', () => {
    const originalPositions = { ...getState().project.keyframes[0].positions };

    getState().dispatch({ type: 'ADD_KEYFRAME' });

    expect(getState().project.keyframes).toHaveLength(2);
    expect(getState().currentKeyframeIndex).toBe(1);
    expect(getState().project.keyframes[1].positions).toEqual(originalPositions);
  });

  it('ADD_KEYFRAME enforces max keyframes limit', () => {
    for (let i = 0; i < MAX_KEYFRAMES - 1; i++) {
      getState().dispatch({ type: 'ADD_KEYFRAME' });
    }
    expect(getState().project.keyframes).toHaveLength(MAX_KEYFRAMES);

    getState().dispatch({ type: 'ADD_KEYFRAME' });
    expect(getState().project.keyframes).toHaveLength(MAX_KEYFRAMES);
  });

  it('DELETE_KEYFRAME prevents deleting last keyframe', () => {
    const kfId = getState().project.keyframes[0].id;

    getState().dispatch({ type: 'DELETE_KEYFRAME', keyframeId: kfId });
    expect(getState().project.keyframes).toHaveLength(1);
  });

  it('DELETE_KEYFRAME adjusts currentKeyframeIndex', () => {
    getState().dispatch({ type: 'ADD_KEYFRAME' });
    getState().dispatch({ type: 'ADD_KEYFRAME' });
    expect(getState().currentKeyframeIndex).toBe(2);

    const lastKfId = getState().project.keyframes[2].id;
    getState().dispatch({ type: 'DELETE_KEYFRAME', keyframeId: lastKfId });
    expect(getState().currentKeyframeIndex).toBe(1);
    expect(getState().project.keyframes).toHaveLength(2);
  });

  it('SELECT_KEYFRAME changes current index', () => {
    getState().dispatch({ type: 'ADD_KEYFRAME' });
    getState().dispatch({ type: 'SELECT_KEYFRAME', index: 0 });
    expect(getState().currentKeyframeIndex).toBe(0);
  });

  it('SELECT_KEYFRAME ignores out-of-range index', () => {
    getState().dispatch({ type: 'SELECT_KEYFRAME', index: 99 });
    expect(getState().currentKeyframeIndex).toBe(0);
  });

  it('SELECT_TOKEN sets selectedTokenId', () => {
    const tokenId = getState().project.tokens[0].id;

    getState().dispatch({ type: 'SELECT_TOKEN', tokenId });
    expect(getState().selectedTokenId).toBe(tokenId);

    getState().dispatch({ type: 'SELECT_TOKEN', tokenId: null });
    expect(getState().selectedTokenId).toBeNull();
  });

  it('CLEAR resets to default 4-4-2 formation', () => {
    getState().dispatch({ type: 'ADD_KEYFRAME' });
    getState().dispatch({ type: 'REMOVE_TOKEN', tokenId: getState().project.tokens[0].id });

    getState().dispatch({ type: 'CLEAR' });
    expect(getState().project.tokens).toHaveLength(12);
    expect(getState().project.keyframes).toHaveLength(1);
    expect(getState().currentKeyframeIndex).toBe(0);
    expect(getState().selectedTokenId).toBeNull();
  });

  it('SET_NAME updates project name', () => {
    getState().dispatch({ type: 'SET_NAME', name: '4-3-3 공격' });
    expect(getState().project.name).toBe('4-3-3 공격');
  });
});

describe('undo/redo', () => {
  it('undo reverts MOVE_TOKEN', () => {
    const tokenId = getState().project.tokens[0].id;
    const originalPos = getState().project.keyframes[0].positions[tokenId];

    getState().dispatch({ type: 'MOVE_TOKEN', tokenId, position: { x: 0.9, y: 0.9 } });
    expect(getState().project.keyframes[0].positions[tokenId]).toEqual({ x: 0.9, y: 0.9 });

    getState().undo();
    expect(getState().project.keyframes[0].positions[tokenId]).toEqual(originalPos);
  });

  it('redo restores undone action', () => {
    const tokenId = getState().project.tokens[0].id;
    const movedPos = { x: 0.9, y: 0.9 };

    getState().dispatch({ type: 'MOVE_TOKEN', tokenId, position: movedPos });
    getState().undo();
    getState().redo();

    expect(getState().project.keyframes[0].positions[tokenId]).toEqual(movedPos);
  });

  it('new action clears redo stack', () => {
    const tokenId = getState().project.tokens[0].id;

    getState().dispatch({ type: 'MOVE_TOKEN', tokenId, position: { x: 0.1, y: 0.1 } });
    getState().undo();
    expect(getState().redoStack.length).toBeGreaterThan(0);

    getState().dispatch({ type: 'MOVE_TOKEN', tokenId, position: { x: 0.2, y: 0.2 } });
    expect(getState().redoStack).toHaveLength(0);
  });

  it('undo/redo stacks report correctly', () => {
    expect(getState().undoStack).toHaveLength(0);
    expect(getState().redoStack).toHaveLength(0);

    const tokenId = getState().project.tokens[0].id;
    getState().dispatch({ type: 'MOVE_TOKEN', tokenId, position: { x: 0.5, y: 0.5 } });
    expect(getState().undoStack.length).toBeGreaterThan(0);
    expect(getState().redoStack).toHaveLength(0);

    getState().undo();
    expect(getState().undoStack).toHaveLength(0);
    expect(getState().redoStack.length).toBeGreaterThan(0);
  });
});
