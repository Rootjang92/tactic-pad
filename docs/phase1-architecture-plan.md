# Phase 1 Prototype: TacticPad Architecture Plan

## Context

TacticPad is a web-based tactical board for Korean soccer coaches. The existing
market leader (TacticalPad) has 2.5M downloads but a 2010-era UX. This Phase 1
prototype validates the core interaction: drag player tokens on a soccer half-court
and animate tactical movements via keyframes. The design doc (from /office-hours)
chose Approach C: build prototype, observe coaches, then build full MVP.

**Goal:** Functional prototype in 1 week. Soccer half-court canvas + drag tokens +
keyframe animation + localStorage + JSON export/import. Korean UI. Mobile-responsive.

**Tech:** Next.js 16 + React 19 + TypeScript + Tailwind 4 + Konva.js (react-konva)

---

## Architecture

### Data Model

```typescript
// lib/types.ts

interface TacticProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  tokens: Token[];
  keyframes: Keyframe[];
}

interface Token {
  id: string;
  type: 'player' | 'ball';
  team: 'home' | 'away';
  number: number;         // 1-11 for players, 0 for ball
}

interface Keyframe {
  id: string;
  order: number;          // 0-9 (max 10 keyframes)
  positions: Record<string, Position>;  // tokenId -> position
}

interface Position {
  x: number;  // normalized 0-1 (relative to field dimensions)
  y: number;  // normalized 0-1
}
```

**Key decision: normalized positions (0-1) with fixed aspect ratio.**
Canvas renders at different sizes on mobile/tablet/desktop. Storing absolute
pixel coords would break on resize. Normalized coords scale to any canvas size.

**Aspect ratio contract:** The soccer half-court has a fixed aspect ratio (~1.2:1
width:height). The canvas ALWAYS maintains this ratio. On screens with different
proportions, the canvas is letterboxed/pillarboxed (remaining space filled with
background color). This ensures (0.5, 0.5) maps to the same field position on
every device. Convert on render: `screenX = normalizedX * fieldWidth`.

### Konva Layer Strategy

```
Stage (responsive, fills container)
├── Layer 1: Field (static)     listening(false), cached
│   └── Soccer half-court lines, arcs, penalty area
├── Layer 2: Trails (playback)  listening(false)
│   └── Dotted lines showing movement paths
└── Layer 3: Tokens (interactive)
    ├── PlayerToken (circle + number text, draggable)
    └── BallToken (small circle, draggable)
```

3 layers. Within Konva's recommended 3-5 max. Field layer is drawn once and
cached for performance. Trail layer only renders during playback. Token layer
handles all drag interaction.

### Screen Layout & Visual Hierarchy

The field IS the product. All chrome (toolbar, timeline, controls) is subordinate.

**Desktop (1280x800):**
```
┌──────────────────────────────────────────┐
│  Toolbar (48px)  [홈+][어웨이+][공+] [↩↪🗑]│  ← tertiary: admin chrome
├──────────────────────────────────────────┤
│                                          │
│                                          │
│         SOCCER HALF-COURT                │
│         (fills remaining space, 70%+)    │  ← PRIMARY: the product
│         aspect ratio 1.2:1 exact         │
│                                          │
│                                          │
├──────────────────────────────────────────┤
│  Timeline+Playback (48px)                │  ← secondary: combined bar
│  [●○○○○] ─────scrubber──── [▶] [1x]     │
└──────────────────────────────────────────┘
```

**Mobile (375x667):**
```
┌──────────────────────┐
│                      │
│   SOCCER HALF-COURT  │  ← fills top ~75%
│   (touch-optimized)  │
│                      │
├──────────────────────┤
│ Timeline (44px)      │  ← timeline + playback combined
│ [●○○] ──scrub── [▶]  │
├──────────────────────┤
│ Bottom bar (56px)    │  ← toolbar moves to bottom (thumb zone)
│ [+홈][+어][+공][↩][🗑] │
└──────────────────────┘
```

**Tablet (768x1024):** Same as desktop layout but full-width field.
Toolbar stays at top (enough screen height). Timeline at bottom.

**Key layout rules:**
- Toolbar + Timeline combined must never exceed 30% of viewport height
- Field gets all remaining space, always maintaining 1.2:1 aspect ratio
- On mobile, toolbar moves to bottom for thumb reachability (iOS/Android pattern)
- Timeline and PlaybackControls merge into a single 48px bar (no separate sections)

### Component Tree

```
app/page.tsx
└── TacticProvider (Context + useReducer)
    └── <main> (responsive container)
        ├── Toolbar (desktop: top 48px / mobile: bottom 56px)
        │   ├── Add Home Player / Add Away Player / Add Ball buttons
        │   ├── Clear button
        │   └── Undo/Redo buttons
        ├── TacticBoard (dynamic import, ssr: false)
        │   └── <Stage>
        │       ├── <FieldLayer />
        │       ├── <TrailLayer />
        │       └── <TokenLayer />
        └── TimelineBar (combined, 48px)
            ├── KeyframeMarker (per keyframe, clickable)
            ├── Scrubber (position indicator)
            ├── Add/Delete Keyframe buttons
            ├── Play/Pause button
            └── Speed toggle (0.5x / 1x / 2x)
```

### File Structure

```
app/
  layout.tsx              # Root layout (existing, update metadata)
  page.tsx                # Main page, wraps everything in TacticProvider
  globals.css             # Extend with field colors, Korean font

components/
  board/
    TacticBoard.tsx       # Dynamic wrapper for Konva Stage
    FieldLayer.tsx        # Static soccer half-court
    TokenLayer.tsx        # Draggable tokens
    TrailLayer.tsx        # Movement trail lines
    PlayerToken.tsx       # Single player token (circle + number)
    BallToken.tsx         # Ball token
  timeline/
    Timeline.tsx          # Keyframe timeline bar
    KeyframeMarker.tsx    # Single keyframe indicator
  controls/
    Toolbar.tsx           # Top toolbar
    PlaybackControls.tsx  # Play/pause/speed
  Toast.tsx               # Simple toast notification for errors

hooks/
  useTacticState.ts       # useReducer + Context definition
  usePlayback.ts          # Animation engine (rAF + interpolation)
  useAutoSave.ts          # Debounced localStorage persistence
  useCanvasSize.ts        # Responsive canvas dimensions

lib/
  types.ts                # All TypeScript interfaces
  constants.ts            # Field dimensions, colors, token defaults
  interpolation.ts        # Linear interpolation between keyframes
  storage.ts              # localStorage read/write with error handling

providers/
  TacticProvider.tsx      # Context provider component
```

**Total: ~18 new files.** No new services, no API routes, no database.
Pure client-side React app inside Next.js shell.

### Visual Design Constants

```typescript
// lib/constants.ts — visual design preview

// App chrome
const APP_BG = '#1a1a1a';            // Dark background (not pure black)
const TOOLBAR_BG = '#242424';         // Slightly lighter toolbar
const TOOLBAR_HEIGHT = 48;            // px
const TIMELINE_HEIGHT = 48;           // px
const MOBILE_BOTTOM_BAR_HEIGHT = 56;  // px

// Field
const FIELD_GREEN = '#2d8a4e';        // Rich grass green (not neon, not dark)
const FIELD_LINE_COLOR = '#ffffff';   // White lines
const FIELD_LINE_WIDTH = 2;           // px (at 1x scale)
const FIELD_ASPECT_RATIO = 1.2;      // width:height = 1.2:1 (exact)
const FIELD_PADDING = 16;            // px padding inside field boundary

// Tokens
const TOKEN_RADIUS = 18;             // px (at 1x scale)
const HOME_COLOR = '#2563eb';        // Blue (home team)
const HOME_COLOR_LIGHT = '#3b82f6';  // Lighter blue for hover/active
const AWAY_COLOR = '#dc2626';        // Red (away team)
const AWAY_COLOR_LIGHT = '#ef4444';  // Lighter red for hover/active
const BALL_COLOR = '#fbbf24';        // Amber/gold (ball)
const BALL_RADIUS = 10;             // px (smaller than player)
const TOKEN_NUMBER_FONT = '13px Geist Sans';
const TOKEN_NUMBER_COLOR = '#ffffff'; // White number on colored circle
const TOKEN_SHADOW_REST = { blur: 2, offset: 1, opacity: 0.15 };
const TOKEN_SHADOW_DRAG = { blur: 8, offset: 3, opacity: 0.3 };
const TOKEN_DRAG_SCALE = 1.15;

// Trail lines
const TRAIL_COLOR = '#ffffff';
const TRAIL_OPACITY = 0.4;
const TRAIL_DASH = [6, 4];           // Dashed line pattern
const TRAIL_WIDTH = 2;

// Timeline
const TIMELINE_BG = '#1f1f1f';
const KEYFRAME_DOT_RADIUS = 6;
const KEYFRAME_DOT_COLOR = '#525252';       // Inactive
const KEYFRAME_DOT_ACTIVE = '#3b82f6';      // Active (matches home blue)
const SCRUBBER_COLOR = '#ffffff';
const SCRUBBER_WIDTH = 2;

// UI
const BUTTON_RADIUS = 6;            // px, subtle rounded corners (NOT bubbly)
const TOAST_BG = '#ef4444';          // Error toast
const SAVE_ICON_COLOR = '#22c55e';   // Green checkmark for auto-save

// Touch targets
const MIN_TOUCH_TARGET = 44;         // px minimum (Apple HIG)
```

**Design direction: Professional sports tool.**
Think FIFA broadcast tactical overlay, not SaaS dashboard. Dark chrome frames
the green field. Clean, calm hierarchy. No decorative gradients, no colored
circles around icons, no card grids. The field is the hero. Everything else
is subordinate. Blue/red team colors are vivid against the green. The app
should feel like it was made by someone who watches football, not by someone
who generates SaaS templates.

### State Management

React Context + useReducer. No external library needed.

```typescript
// hooks/useTacticState.ts

// Project actions (persisted to localStorage)
type ProjectAction =
  | { type: 'MOVE_TOKEN'; tokenId: string; position: Position }
  | { type: 'ADD_TOKEN'; token: Token; position: Position }
  | { type: 'REMOVE_TOKEN'; tokenId: string }
  | { type: 'ADD_KEYFRAME' }
  | { type: 'DELETE_KEYFRAME'; keyframeId: string }
  | { type: 'SELECT_KEYFRAME'; index: number }
  | { type: 'LOAD_PROJECT'; project: TacticProject }
  | { type: 'CLEAR' }
  | { type: 'SET_NAME'; name: string };

// Separate concerns: project data (saved) vs UI state (ephemeral)
// TacticProvider exposes both via context
interface ProjectState {
  project: TacticProject;
  currentKeyframeIndex: number;
}

// UI state lives in usePlayback hook (useState + useRef), not persisted.
// usePlayback renders interpolated positions via Konva node refs,
// NOT through the reducer. This means auto-save never saves
// interpolated positions — only the source-of-truth keyframe data.
interface PlaybackState {
  isPlaying: boolean;
  playbackSpeed: 0.5 | 1 | 2;
  interpolatedPositions: Record<string, Position> | null;
}

// Undo/redo: action history stack wrapping the reducer.
// undoStack: ProjectState[], redoStack: ProjectState[].
// Each ProjectAction pushes current state to undoStack.
// Ctrl+Z pops undo → pushes to redo. Ctrl+Shift+Z reverses.
// Max 50 history entries to prevent memory bloat.
```

### Animation Engine

```
usePlayback hook
├── State: isPlaying, currentTime, speed
├── On play():
│   1. Lock all tokens (draggable = false)
│   2. Start rAF loop
│   3. For each frame:
│      - Calculate progress between current and next keyframe
│      - Linear interpolate all token positions
│      - Update token positions on canvas
│      - When reaching next keyframe, advance index
│   4. At last keyframe: stop, unlock tokens
├── On pause(): stop rAF, keep current interpolated positions
└── On seek(keyframeIndex): jump to keyframe, update positions
```

**Duration per keyframe transition:** 1000ms at 1x speed. So 0.5x = 2000ms, 2x = 500ms.

### Interaction Quality Spec

**Drag feel:**
- On drag start: token scales to 1.15x with `transition: transform 100ms ease-out`.
  Drop shadow increases (Konva shadow: blur 8, offset 3, opacity 0.3).
  Token moves to highest z-index on its layer.
- On drag end: token snaps to final position with scale returning to 1.0x (100ms ease-out).
  Shadow returns to resting state (blur 2, offset 1, opacity 0.15).
- Drag constrains within field bounds (tokens cannot be dragged outside the pitch).

**Playback loop:**
- When animation reaches last keyframe: tokens stop, play button reappears
  (replaces pause), scrubber stays at end position.
- Timeline dots highlight sequentially during playback to show progress.
- After animation ends, coach can: (1) press play to replay, (2) click any
  keyframe dot to jump there and edit, (3) add a new keyframe.
- No dead end. The loop is: edit → play → review → edit.

**Auto-save confidence:**
- On successful auto-save: a small checkmark icon (✓) appears in the toolbar
  area, fades in and out over 500ms. Subtle, never blocks interaction.
- On save error: toast with Korean message persists until dismissed.
- Visual distinction: save indicator is purely informational (green ✓),
  error toast is actionable (red, with dismiss button).

### Responsive Strategy

```
useCanvasSize hook
├── Listens to container resize (ResizeObserver)
├── Calculates stage dimensions maintaining field aspect ratio
│   - Half-court aspect ratio: ~1.2:1 (width:height)
│   - Max width: container width - padding
│   - Max height: container height - toolbar - timeline - controls
├── Returns { width, height, scale }
└── Tokens convert normalized coords: x * width, y * height
```

Mobile: full-width canvas, toolbar moves to bottom bar (56px, 5 icon buttons).
Tablet: full-width canvas, toolbar horizontal at top.
Desktop: centered canvas with max-width.

### Responsive Breakpoints

```
sm  (≤639px):  Mobile. Bottom bar toolbar. Full-width field. Timeline compact.
md  (640-1023px): Tablet. Top toolbar. Full-width field. Timeline full.
lg  (≥1024px): Desktop. Top toolbar. Centered field with max-width. Timeline full.
```

### Accessibility (Phase 1 Baseline)

**Touch targets:** All buttons and interactive elements minimum 44x44px
(Apple HIG). Toolbar buttons, keyframe dots, play/pause, speed toggle
all meet this minimum. Token circles (36px diameter) are below 44px but
their hit area is expanded via Konva's hitStrokeWidth to 44px effective.

**Color contrast (WCAG AA):**
- Token numbers: white (#ffffff) on blue (#2563eb) = 4.6:1 ratio ✓
- Token numbers: white (#ffffff) on red (#dc2626) = 4.5:1 ratio ✓
- Field lines: white (#ffffff) on green (#2d8a4e) = 4.2:1 ratio ✓
- Toolbar text: white on dark (#242424) = 14.5:1 ratio ✓

**Keyboard navigation (Phase 1 scope):**
- Toolbar buttons: focusable via Tab, activatable via Enter/Space
- Timeline keyframe dots: focusable via Tab
- Playback controls: focusable via Tab
- Canvas tokens: NOT keyboard-navigable in Phase 1 (Konva limitation,
  would require custom focus management). Deferred to Phase 3.
- Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Shift+Z (redo), Space (play/pause)

**Screen readers:** Canvas content is not accessible to screen readers.
Add `aria-label="전술 보드 캔버스"` on the Stage container. Toolbar and
timeline use semantic HTML buttons with Korean labels.

### Storage

```
localStorage key: "tacticpad-project"
├── Auto-save: debounced 500ms after any state change
├── Auto-load: on app mount, check localStorage
└── Format: JSON.stringify(TacticProject)

```

### Next.js Integration

**Critical:** react-konva accesses browser APIs on import. Must use:

```typescript
// components/board/TacticBoard.tsx
"use client";

import dynamic from 'next/dynamic';

const Stage = dynamic(
  () => import('react-konva').then(mod => mod.Stage),
  { ssr: false }
);
```

All Konva-using components need `"use client"` directive.
The page itself can be a client component since there's no server data.

### Korean UI

All UI text in Korean. No i18n library needed for Phase 1 (single language).
Labels stored as constants in `lib/constants.ts`:
- "선수 추가" (Add Player)
- "공 추가" (Add Ball)
- "재생" / "일시정지" (Play / Pause)
- "키프레임 추가" / "삭제" (Add / Delete Keyframe)
- "초기화" (Clear)
- "되돌리기" / "다시 실행" (Undo / Redo)

### Edge Cases

1. **Max tokens:** 22 players + 1 ball = 23 tokens max. Enforce in ADD_TOKEN.
2. **Max keyframes:** 10. Enforce in ADD_KEYFRAME.
3. **Empty keyframe:** New keyframe copies positions from previous keyframe.
4. **Delete last keyframe:** Prevent. Minimum 1 keyframe always exists.
5. **Delete token:** Remove from all keyframes' positions.
6. **Token added mid-timeline:** New token's position is set at the current keyframe.
   For all other existing keyframes, the token gets the same initial position.
   During interpolation, if a token exists in keyframe B but not A, it appears
   at its B position from the start (no interpolation for that segment).
7. **Unsupported browser:** Check for canvas support, show Korean message.
8. **Touch vs mouse:** Konva handles both natively. Ensure touch-action: none on Stage container.
9. **localStorage failure:** try/catch on all writes. Show Korean toast
   ("저장에 실패했습니다. 브라우저 설정을 확인해주세요.") on error.
   App continues working in memory — data not lost until tab close.

### First-Run Experience

**On first launch (no localStorage data):** The app pre-populates a 4-4-2 formation
with 11 home players (blue) + 1 ball on the field. No away players (coach adds
manually since they pick the opposing formation). Ball starts at center circle.

```
First-run field state:
         GK(1)
   RB(2) CB(3) CB(4) LB(5)
   RM(6) CM(7) CM(8) LM(9)
       ST(10) ST(11)
           ⚽ (center circle)
```

A subtle Korean tooltip appears for 3 seconds: "토큰을 드래그해서 위치를 조정하세요"
(Drag tokens to adjust positions). Fades out. Does not block interaction.

### Token Interaction Design

**Tap to select:** Tapping a token (without dragging) selects it. Selected token
shows a bright ring/glow. Tapping again or tapping empty field deselects.
Dragging is separate from selection (drag starts on hold+move, not on tap).

**Delete individual token:** When a token is selected, a small delete button (✕)
appears above the token. Tapping ✕ removes the token from all keyframes.
This prevents the "add-only" problem where the coach must clear everything
to remove one misplaced player.

**Speed toggle:** Single cycle button showing current speed ("×1").
Each tap cycles: 0.5x → 1x → 2x → 0.5x. Placed at the right end of the
timeline bar. Compact, saves space on mobile.

**Keyframe add feedback:** When a new keyframe is added, the new dot appears
on the timeline with a brief scale-up animation (0 → 1.0 over 200ms) and
the scrubber auto-moves to the new keyframe. The coach sees exactly where
the new keyframe landed.

### Interaction State Matrix

```
FEATURE           | LOADING           | EMPTY              | ERROR              | ACTIVE             | DISABLED
──────────────────|───────────────────|────────────────────|────────────────────|────────────────────|──────────────────
TacticBoard       | Skeleton field    | 4-4-2 home preset  | "캔버스를 로드할    | Green field +      | During playback:
(Konva Stage)     | outline (no Konva | (first-run)        | 수 없습니다"        | tokens visible     | tokens show but
                  | loaded yet)       |                    | + retry button     |                    | not draggable
──────────────────|───────────────────|────────────────────|────────────────────|────────────────────|──────────────────
Token             | n/a               | n/a                | n/a                | Circle + number,   | Semi-transparent
                  |                   |                    |                    | slight shadow,     | (opacity: 0.6),
                  |                   |                    |                    | drag cursor        | no drag cursor
──────────────────|───────────────────|────────────────────|────────────────────|────────────────────|──────────────────
Token (selected)  | n/a               | n/a                | n/a                | Bright ring/glow   | n/a (no selection
                  |                   |                    |                    | around token       | during playback)
──────────────────|───────────────────|────────────────────|────────────────────|────────────────────|──────────────────
Token (dragging)  | n/a               | n/a                | n/a                | Scale 1.15x,       | n/a
                  |                   |                    |                    | elevated shadow,   |
                  |                   |                    |                    | z-index top        |
──────────────────|───────────────────|────────────────────|────────────────────|────────────────────|──────────────────
Toolbar           | Buttons disabled  | All buttons active | n/a                | Normal             | During playback:
                  | (Konva loading)   |                    |                    |                    | add/clear disabled
──────────────────|───────────────────|────────────────────|────────────────────|────────────────────|──────────────────
Timeline          | Empty bar, no     | 1 keyframe dot     | n/a                | Dots + scrubber    | n/a
                  | keyframe dots     | (initial)          |                    | + active indicator |
──────────────────|───────────────────|────────────────────|────────────────────|────────────────────|──────────────────
Playback          | Play disabled     | Play enabled       | n/a                | Pause shown        | n/a
                  |                   | (1 keyframe = no   |                    | (replaces play)    |
                  |                   | animation, grey)   |                    |                    |
──────────────────|───────────────────|────────────────────|────────────────────|────────────────────|──────────────────
localStorage      | n/a               | n/a                | Toast: "저장에      | Auto-save icon     | n/a
save              |                   |                    | 실패했습니다"        | flash (subtle)     |
──────────────────|───────────────────|────────────────────|────────────────────|────────────────────|──────────────────
Clear action      | n/a               | n/a                | n/a                | Confirm dialog:    | n/a
                  |                   |                    |                    | "모두 초기화?"      |
                  |                   |                    |                    | [확인] [취소]       |
```

**Token z-order rule:** Last-dragged token is always on top (highest z-index).
When formations stack players tightly (defensive walls, corner setups), the coach
needs to grab the specific token they want without fighting overlap.

---

## Data Flow Diagram

```
User drags token on canvas
        │
        v
TokenLayer.onDragEnd(tokenId, {x, y})
        │
        v
Convert to normalized: {x/canvasW, y/canvasH}
        │
        v
dispatch({ type: 'MOVE_TOKEN', tokenId, position })
        │
        v
Reducer updates currentKeyframe.positions[tokenId]
        │
        v
useAutoSave detects change → debounced localStorage write
        │
        v
React re-renders TokenLayer with new positions
```

```
User clicks Play
        │
        v
usePlayback.play()
        │
        v
Set isPlaying=true, lock tokens (draggable=false)
        │
        v
rAF loop starts
        │
        v
Each frame: interpolate positions between keyframes[i] and keyframes[i+1]
        │           based on elapsed time and playbackSpeed
        v
Update token positions on canvas (via Konva node refs)
        │
        v
Show trail lines on TrailLayer (dotted lines from start to current)
        │
        v
When animation reaches last keyframe: stop, unlock tokens
```

---

## Dependencies

```json
{
  "dependencies": {
    "konva": "^9.x",
    "react-konva": "^19.x"
  }
}
```

Only 2 new runtime packages. react-konva peer-depends on konva.

**Note:** react-konva v19 is required for React 19 compatibility.

### Dev Dependencies (Testing)

```json
{
  "devDependencies": {
    "vitest": "^3.x",
    "@testing-library/react": "^16.x",
    "@vitejs/plugin-react": "^4.x",
    "jsdom": "^25.x"
  }
}
```

### Test Strategy

**Unit tests (Vitest):** Pure logic that doesn't need a canvas.
- `__tests__/tacticReducer.test.ts` — All reducer actions (MOVE, ADD, REMOVE, keyframe CRUD, LOAD, CLEAR) + undo/redo
- `__tests__/interpolation.test.ts` — Linear interpolation edge cases, missing tokens
- `__tests__/storage.test.ts` — localStorage save/load, error handling

**E2E tests (Playwright):** Deferred to Phase 3. Canvas pixel-coordinate assertions
are time-consuming. Phase 1 uses manual testing with /qa for canvas interactions.

**Coverage target:** 100% on reducer + interpolation + storage (pure logic).

---

## NOT in scope (Phase 1)

- 3D view or 3D transitions
- Video recording/export
- Multi-sport support (only soccer half-court)
- User accounts or authentication
- Project folders/organization
- AI features
- Image/GIF export (Phase 3)
- PWA offline mode (Phase 3)
- Cross-device real-time sharing
- Supabase backend
- Keyframe reordering (Phase 3)
- Full-court view (only half-court)
- JSON export/import (deferred to Phase 3 with Supabase)
- E2E tests (Playwright, deferred to Phase 3)

---

## What already exists

- Next.js 16 + React 19 + TypeScript + Tailwind 4 project shell
- App Router configured with layout.tsx and page.tsx
- ESLint + TypeScript strict mode
- Geist font (keep for UI, good for Korean too)
- Dark mode CSS custom properties (can leverage for field theme)

Nothing else exists. Everything in this plan is new code.

---

## TODOS (to create in TODOS.md)

1. **JSON export/import for cross-device sharing**
   - Phase 3. 코치가 사무실 PC → 훈련장 태블릿으로 전술 이동 시 필요.
   - Supabase 동기화와 중복 가능성 있음. Phase 2 코치 관찰 후 결정.

2. **Playwright E2E tests for canvas interactions**
   - Phase 3. 캔버스 드래그, 애니메이션, 저장/불러오기 브라우저 테스트.
   - Konva canvas E2E는 작성 난이도 높음. UI 안정화 후 추가.

---

## Worktree Parallelization Strategy

| Step | Modules touched | Depends on |
|------|----------------|------------|
| A: Data model + Reducer + Tests | lib/, hooks/useTacticState, __tests__/ | — |
| B: Konva canvas + Field + Tokens | components/board/ | A (needs types) |
| C: Timeline + Playback | components/timeline/, components/controls/, hooks/usePlayback | A (needs reducer) |
| D: Responsive + Auto-save + Polish | hooks/useCanvasSize, hooks/useAutoSave, app/ | A, B |

**Parallel lanes:**
- Lane 1: A → B → D (sequential, shared models/hooks)
- Lane 2: C (can start after A completes, parallel with B)

**Execution:** A first (foundation). Then B + C in parallel. D last (integration).

Since this is a 1-person project with shared state dependencies, sequential
execution is more practical. Parallelization only saves time on B + C.

---

## Verification

1. `bun install` — installs konva + react-konva
2. `bun dev` — starts dev server
3. Open in browser:
   - See soccer half-court on green canvas
   - Add players (home/away), see numbered circles
   - Drag tokens around the field
   - Add keyframe, move tokens, add another keyframe
   - Press play, see tokens animate between positions with trail lines
   - Change speed (0.5x, 1x, 2x)
   - Ctrl+Z to undo last drag, Ctrl+Shift+Z to redo
   - Resize browser window — canvas and token positions adapt
   - Open on mobile viewport — touch drag works, UI is usable
   - Close and reopen tab — state restored from localStorage
4. `bun lint` — no errors
5. `bun test` — all unit tests pass (reducer, interpolation, storage)

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR | 4 issues, 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | CLEAR | score: 3/10 → 8/10, 5 decisions |

- **UNRESOLVED:** 0 decisions across all reviews
- **VERDICT:** ENG + DESIGN CLEARED — ready to implement.
