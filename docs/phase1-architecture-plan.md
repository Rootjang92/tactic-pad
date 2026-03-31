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

### Component Tree

```
app/page.tsx
└── TacticProvider (Context + useReducer)
    └── <main> (responsive container)
        ├── Toolbar
        │   ├── Add Home Player / Add Away Player / Add Ball buttons
        │   ├── Clear button
        │   └── Undo/Redo buttons
        ├── TacticBoard (dynamic import, ssr: false)
        │   └── <Stage>
        │       ├── <FieldLayer />
        │       ├── <TrailLayer />
        │       └── <TokenLayer />
        ├── Timeline
        │   ├── KeyframeMarker (per keyframe, clickable)
        │   ├── Scrubber (position indicator)
        │   └── Add/Delete Keyframe buttons
        └── PlaybackControls
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

Mobile: full-width canvas, toolbar collapses to icons.
Tablet: full-width canvas, toolbar horizontal.
Desktop: centered canvas with max-width.

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
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |

**VERDICT:** ENG CLEARED — ready to implement.
