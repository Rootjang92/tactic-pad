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
}

export interface Position {
  x: number; // normalized 0-1
  y: number; // normalized 0-1
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
