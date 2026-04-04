export interface Token {
  id: string;
  type: "player" | "ball";
  team: "home" | "away";
  number: number; // 1-11 for players, 0 for ball
}

export interface Keyframe {
  id: string;
  order: number; // 0-9 (max 10 keyframes)
  positions: Record<string, Position>; // tokenId -> position
}

export interface TacticProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  tokens: Token[];
  keyframes: Keyframe[];
  // Phase 3 추가
  folderId: string | null;
  teamId: string | null;
  userId: string | null;     // null = 게스트 로컬 전용
  syncStatus: SyncStatus;
  deletedAt: string | null;  // soft delete
}

export interface Position {
  x: number; // normalized 0-1
  y: number; // normalized 0-1
}

export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'local-only';

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;   // 1-depth만 지원
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface Team {
  id: string;
  name: string;              // "서울 FC U-18"
  formation: string;         // "4-4-2", "4-3-3" 등
  players: TeamPlayer[];
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface TeamPlayer {
  number: number;            // 등번호
  name: string;              // "김민수"
  position: string;          // "GK", "CB", "ST" 등
}

export interface SyncQueueItem {
  id: string;
  table: 'projects' | 'folders' | 'teams';
  recordId: string;
  operation: 'upsert' | 'delete';
  payload: unknown;
  timestamp: string;         // ISO 8601
  retryCount: number;
  status: 'pending' | 'in-flight' | 'failed';
}

export interface ProjectState {
  project: TacticProject;
  currentKeyframeIndex: number;
  selectedTokenId: string | null;
}

export interface PlaybackState {
  isPlaying: boolean;
  playbackSpeed: 0.5 | 1 | 2;
  interpolatedPositions: Record<string, Position> | null;
}

export type ProjectAction =
  | { type: "MOVE_TOKEN"; tokenId: string; position: Position }
  | { type: "ADD_TOKEN"; token: Token; position: Position }
  | { type: "REMOVE_TOKEN"; tokenId: string }
  | { type: "ADD_KEYFRAME" }
  | { type: "DELETE_KEYFRAME"; keyframeId: string }
  | { type: "SELECT_KEYFRAME"; index: number }
  | { type: "SELECT_TOKEN"; tokenId: string | null }
  | { type: "LOAD_PROJECT"; project: TacticProject }
  | { type: "CLEAR" }
  | { type: "SET_NAME"; name: string };
