import type { TacticProject, Token, Keyframe, Position } from './types';

// App chrome
export const APP_BG = '#1a1a1a';
export const TOOLBAR_BG = '#242424';
export const TOOLBAR_HEIGHT = 48;
export const TIMELINE_HEIGHT = 48;
export const MOBILE_BOTTOM_BAR_HEIGHT = 56;

// Field
export const FIELD_GREEN = '#2d8a4e';
export const FIELD_LINE_COLOR = '#ffffff';
export const FIELD_LINE_WIDTH = 2;
export const FIELD_ASPECT_RATIO = 1.2; // width:height = 1.2:1
export const FIELD_PADDING = 16;

// Tokens
export const TOKEN_RADIUS = 18;
export const HOME_COLOR = '#2563eb';
export const HOME_COLOR_LIGHT = '#3b82f6';
export const AWAY_COLOR = '#dc2626';
export const AWAY_COLOR_LIGHT = '#ef4444';
export const BALL_COLOR = '#fbbf24';
export const BALL_RADIUS = 10;
export const TOKEN_NUMBER_FONT = '13px Geist Sans, sans-serif';
export const TOKEN_NUMBER_COLOR = '#ffffff';
export const TOKEN_SHADOW_REST = { blur: 2, offsetX: 1, offsetY: 1, opacity: 0.15 };
export const TOKEN_SHADOW_DRAG = { blur: 8, offsetX: 3, offsetY: 3, opacity: 0.3 };
export const TOKEN_DRAG_SCALE = 1.15;

// Trail lines
export const TRAIL_COLOR = '#ffffff';
export const TRAIL_OPACITY = 0.4;
export const TRAIL_DASH = [6, 4];
export const TRAIL_WIDTH = 2;

// Timeline
export const TIMELINE_BG = '#1f1f1f';
export const KEYFRAME_DOT_RADIUS = 6;
export const KEYFRAME_DOT_COLOR = '#525252';
export const KEYFRAME_DOT_ACTIVE = '#3b82f6';
export const SCRUBBER_COLOR = '#ffffff';
export const SCRUBBER_WIDTH = 2;

// UI
export const BUTTON_RADIUS = 6;
export const TOAST_BG = '#ef4444';
export const SAVE_ICON_COLOR = '#22c55e';
export const MIN_TOUCH_TARGET = 44;

// Playback
export const KEYFRAME_DURATION_MS = 1000; // at 1x speed
export const MAX_KEYFRAMES = 10;
export const MAX_TOKENS = 23; // 11 home + 11 away + 1 ball
export const MAX_PLAYERS_PER_TEAM = 11;
export const MAX_UNDO_HISTORY = 50;

// Korean UI labels
export const LABELS = {
  addHomePlayer: '홈 선수 추가',
  addAwayPlayer: '어웨이 선수 추가',
  addBall: '공 추가',
  play: '재생',
  pause: '일시정지',
  addKeyframe: '키프레임 추가',
  deleteKeyframe: '삭제',
  clear: '초기화',
  undo: '되돌리기',
  redo: '다시 실행',
  confirmClear: '모두 초기화?',
  confirm: '확인',
  cancel: '취소',
  saveFailed: '저장에 실패했습니다. 브라우저 설정을 확인해주세요.',
  canvasLoadFailed: '캔버스를 로드할 수 없습니다',
  firstRunTooltip: '토큰을 드래그해서 위치를 조정하세요',
  unsupportedBrowser: 'Chrome 또는 Safari를 사용해주세요',
} as const;

// 4-4-2 default formation (normalized 0-1 coordinates)
// Field orientation: goal at top, center line at bottom
const DEFAULT_FORMATION: { number: number; position: Position }[] = [
  { number: 1, position: { x: 0.5, y: 0.08 } },   // GK
  { number: 2, position: { x: 0.15, y: 0.25 } },   // RB
  { number: 3, position: { x: 0.38, y: 0.22 } },   // CB
  { number: 4, position: { x: 0.62, y: 0.22 } },   // CB
  { number: 5, position: { x: 0.85, y: 0.25 } },   // LB
  { number: 6, position: { x: 0.15, y: 0.50 } },   // RM
  { number: 7, position: { x: 0.38, y: 0.45 } },   // CM
  { number: 8, position: { x: 0.62, y: 0.45 } },   // CM
  { number: 9, position: { x: 0.85, y: 0.50 } },   // LM
  { number: 10, position: { x: 0.38, y: 0.72 } },  // ST
  { number: 11, position: { x: 0.62, y: 0.72 } },  // ST
];

const BALL_DEFAULT_POSITION: Position = { x: 0.5, y: 0.85 }; // center circle area

export function generateId(): string {
  return crypto.randomUUID();
}

export function createDefaultProject(): TacticProject {
  const tokens: Token[] = DEFAULT_FORMATION.map((entry) => ({
    id: generateId(),
    type: 'player' as const,
    team: 'home' as const,
    number: entry.number,
  }));

  const ball: Token = {
    id: generateId(),
    type: 'ball',
    team: 'home', // team is irrelevant for ball
    number: 0,
  };
  tokens.push(ball);

  const positions: Record<string, Position> = {};
  DEFAULT_FORMATION.forEach((entry, i) => {
    positions[tokens[i].id] = entry.position;
  });
  positions[ball.id] = BALL_DEFAULT_POSITION;

  const keyframe: Keyframe = {
    id: generateId(),
    order: 0,
    positions,
  };

  return {
    id: generateId(),
    name: '새 전술',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tokens,
    keyframes: [keyframe],
    folderId: null,
    teamId: null,
    userId: null,
    syncStatus: 'local-only' as const,
    deletedAt: null,
  };
}
