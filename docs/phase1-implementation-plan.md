# Phase 1 구현 계획: TacticPad 프로토타입

## Context

TacticPad Phase 1 프로토타입을 구현합니다. 아키텍처 플랜(`docs/phase1-architecture-plan.md`)과
디자인 리뷰가 완료된 상태이며, Eng + Design 모두 CLEAR. 플랜에 정의된 데이터 모델, 비주얼 상수,
인터랙션 스펙, 상태 매트릭스를 그대로 구현합니다.

**패키지 매니저:** bun (npm 아님)

---

## 구현 상태 요약

| Step | 설명 | 상태 |
|------|------|------|
| A | 데이터 모델 + 스토어 + 테스트 | ✅ 완료 |
| B | Konva 캔버스 + 필드 + 토큰 | ✅ 완료 |
| C | 타임라인 + 재생 컨트롤 | ✅ 완료 |
| D | 반응형 + 자동저장 + 통합 폴리시 | ✅ 완료 |

---

## 플랜 대비 변경사항

### 아키텍처 변경
- **상태관리:** Context + useReducer → **Zustand** (`stores/useTacticStore.ts`)
  - 이유: 보일러플레이트 감소, persist 미들웨어로 localStorage 자동 처리, 외부에서 `getState()` 접근 가능 (재생 엔진에서 필요)
- **`providers/TacticProvider.tsx` 제거:** Zustand는 전역 스토어이므로 Context Provider 불필요
- **`hooks/useTacticState.ts` → `stores/useTacticStore.ts`:** 리듀서 로직이 Zustand store 내부로 통합
- **`lib/storage.ts` 제거:** Zustand persist 미들웨어가 localStorage 저장/로드를 자동 처리
- **`__tests__/storage.test.ts` 제거:** 별도 storage 유틸리티가 없으므로 해당 테스트 불필요

### 파일 구조 변경
- `hooks/useTacticState.ts` → `stores/useTacticStore.ts` (Zustand store)
- `lib/storage.ts` — 불필요 (Zustand persist가 대체)
- `providers/TacticProvider.tsx` — 불필요 (Zustand 전역 스토어)
- `components/controls/PlaybackControls.tsx` — Timeline에 통합 (플랜과 동일)

---

## Step A: 데이터 모델 + 스토어 + 테스트 (기반 레이어) ✅

### A1. 타입 정의 ✅
- **파일:** `lib/types.ts`
- Token, Keyframe, TacticProject, Position, ProjectState, PlaybackState, ProjectAction 정의
- 플랜 §Data Model + §State Management 그대로 구현

### A2. 상수 정의 ✅
- **파일:** `lib/constants.ts`
- 비주얼 상수 전체 (APP_BG, FIELD_GREEN, TOKEN_RADIUS 등)
- 한국어 UI 라벨 (LABELS 객체)
- 4-4-2 기본 포메이션 정규화 좌표 (DEFAULT_FORMATION)
- `createDefaultProject()` 함수
- `generateId()` 유틸리티

### A3. Zustand 스토어 ✅
- **파일:** `stores/useTacticStore.ts`
- `applyAction()`: 모든 ProjectAction 처리 (MOVE_TOKEN, ADD_TOKEN, REMOVE_TOKEN, ADD_KEYFRAME, DELETE_KEYFRAME, SELECT_KEYFRAME, SELECT_TOKEN, LOAD_PROJECT, CLEAR, SET_NAME)
- Undo/Redo: undoStack/redoStack (max 50), 네비게이션 액션은 추적 제외
- Zustand persist 미들웨어: `tacticpad-project` 키로 localStorage 자동 저장
- `skipHydration: true` + 클라이언트에서 수동 rehydrate (SSR 호환)

### A4. 보간 함수 ✅
- **파일:** `lib/interpolation.ts`
- `interpolatePositions(from, to, progress)`: 두 키프레임 간 선형 보간
- progress 0-1 클램핑, 한쪽에만 있는 토큰 처리

### A5. 유닛 테스트 ✅
- **파일:** `__tests__/tacticStore.test.ts` — 25개 테스트 (모든 액션 + undo/redo + 엣지 케이스)
- **파일:** `__tests__/interpolation.test.ts` — 보간 정확도, 경계값, 한쪽 토큰
- **설정:** `vitest.config.ts`

**검증:** `bun test` — 25개 테스트 모두 통과

---

## Step B: Konva 캔버스 + 필드 + 토큰 ✅

### B1. 캔버스 래퍼 ✅
- **파일:** `components/board/TacticBoard.tsx`
- `"use client"` + dynamic import로 react-konva Stage, FieldLayer, TokenLayer, TrailLayer 로드
- SSR 방지, 로딩 스켈레톤, `aria-label="전술 보드 캔버스"`, `touch-action: none`
- `isPlaying`, `interpolatedPositions` props를 하위 레이어에 전달

### B2. 필드 레이어 ✅
- **파일:** `components/board/FieldLayer.tsx`
- `listening={false}`, 레이어 캐시 (`layer.cache()`)
- 반코트 라인: 외곽선, 페널티 에어리어, 골 에어리어, 센터 서클 아크, 페널티 스팟, 페널티 아크

### B3. 선수 토큰 ✅
- **파일:** `components/board/PlayerToken.tsx`
- Konva Group: Circle(TOKEN_RADIUS, HOME/AWAY_COLOR) + Text(번호)
- 드래그: `draggable={!isPlaying}`, scale 1.15x + shadow 증가, moveToTop
- 선택: 링/글로우, 탭 토글
- `dragBoundFunc`로 필드 범위 제한
- `hitStrokeWidth={26}` 터치 타겟 44px 확보
- 재생 중: opacity 0.6

### B4. 공 토큰 ✅
- **파일:** `components/board/BallToken.tsx`
- BALL_RADIUS(10px), BALL_COLOR, 번호 없음
- PlayerToken과 동일한 드래그/선택/터치 인터랙션

### B5. 토큰 레이어 ✅
- **파일:** `components/board/TokenLayer.tsx`
- 모든 토큰 렌더링, 정규화→픽셀 좌표 변환
- `interpolatedPositions` 우선 사용 (재생 중), fallback은 현재 키프레임 positions
- 빈 영역 클릭 시 토큰 선택 해제 (투명 Rect)

### B6. 트레일 레이어 ✅
- **파일:** `components/board/TrailLayer.tsx`
- `listening={false}`, 재생 중에만 표시
- 첫 키프레임 → 현재 보간 위치까지 점선 (TRAIL_DASH, TRAIL_COLOR)

---

## Step C: 타임라인 + 재생 컨트롤 ✅

### C1. 재생 엔진 ✅
- **파일:** `hooks/usePlayback.ts`
- `PlaybackControls` 인터페이스: isPlaying, playbackSpeed, interpolatedPositions, currentKeyframeProgress, play/pause/stop/seek/cycleSpeed
- `requestAnimationFrame` 기반 애니메이션 루프
- `speedRef`로 속도 변경 즉시 반영 (stale closure 방지)
- 키프레임 간 전환: 1000ms / playbackSpeed
- 마지막 키프레임 도달 시: 정지 + interpolatedPositions null

### C2. 타임라인 바 ✅
- **파일:** `components/timeline/Timeline.tsx`
- 48px 높이, Play/Pause 버튼 (키프레임 2개 이상일 때 활성)
- 키프레임 닷: 재생 중 순차 하이라이트, 클릭으로 seek
- 키프레임 추가(+) / 삭제 버튼
- 속도 순환 버튼: ×0.5 / ×1 / ×2

### C3. 키프레임 마커 ✅
- **파일:** `components/timeline/KeyframeMarker.tsx`
- 비활성(#525252) / 활성(#3b82f6) 색상 전환
- 선택 시 scale 애니메이션

---

## Step D: 반응형 + 자동저장 + 통합 폴리시 ✅

### D1. 반응형 캔버스 ✅
- **파일:** `hooks/useCanvasSize.ts`
- ResizeObserver로 컨테이너 크기 감지
- FIELD_ASPECT_RATIO(1.2) 유지하며 최대 크기 계산
- { width, height } 반환

### D2. 자동저장 ✅
- **파일:** `hooks/useAutoSave.ts`
- Zustand subscribe로 `updatedAt` 변경 감지
- 500ms debounce 후 "saved" 상태 → 1.5초 후 "idle"로 복귀
- (Zustand persist가 실제 localStorage 쓰기 담당)

### D3. 툴바 ✅
- **파일:** `components/controls/Toolbar.tsx`
- 버튼: [홈 선수 추가][어웨이 선수 추가][공 추가] / [↩ ↪] / [초기화]
- 초기화: 확인 다이얼로그 "모두 초기화?" [확인][취소]
- 재생 중: 추가/초기화/undo/redo 비활성
- 선수 추가: 다음 미사용 번호 자동 할당, max 11 per team
- 저장 상태: ✓ 표시 (saved일 때)

### D4. 토스트 ✅
- **파일:** `components/Toast.tsx`
- 에러: 빨간 배경, 닫기 버튼
- 정보: 파란 배경, 3초 후 자동 사라짐
- 고정 하단 중앙 위치, fade 트랜지션

### D5. 메인 페이지 통합 ✅
- **파일:** `app/page.tsx`
- Zustand 클라이언트 hydration (`useTacticStore.persist.rehydrate()`)
- 레이아웃: Toolbar(top) + TacticBoard(center, flex:1) + Timeline(bottom)
- TacticBoard에 `isPlaying`, `interpolatedPositions` props 전달
- 키보드 단축키: Ctrl+Z(undo), Ctrl+Shift+Z(redo), Space(play/pause), Delete(토큰 삭제)
- 첫 실행 툴팁: "토큰을 드래그해서 위치를 조정하세요" (3초 후 fade out, localStorage 저장)

### D6. 레이아웃 + 스타일 ✅
- **파일:** `app/layout.tsx`
  - `lang="ko"`, metadata: "TacticPad — 전술 보드"
  - Geist Sans + Geist Mono 폰트
- **파일:** `app/globals.css`
  - CSS 변수: --app-bg, --toolbar-bg, --timeline-bg, --surface, --border
  - 다크 테마 기본, body overflow hidden
  - disabled 버튼 opacity 0.4

---

## 실행 순서 요약

```
A (기반) ──→ B (캔버스) ──→ D (통합)
         └─→ C (타임라인) ──┘
```

실제 구현 순서: A → B → C → D (순차 진행)

---

## 최종 파일 목록 (구현 완료)

| 파일 | Step | 설명 |
|------|------|------|
| `lib/types.ts` | A1 | 타입 정의 |
| `lib/constants.ts` | A2 | 비주얼 상수 + 한국어 라벨 + 기본 포메이션 |
| `stores/useTacticStore.ts` | A3 | Zustand 스토어 (리듀서 + undo/redo + persist) |
| `lib/interpolation.ts` | A4 | 선형 보간 |
| `vitest.config.ts` | A5 | 테스트 설정 |
| `__tests__/tacticStore.test.ts` | A5 | 스토어 테스트 (25개) |
| `__tests__/interpolation.test.ts` | A5 | 보간 테스트 |
| `components/board/TacticBoard.tsx` | B1 | 캔버스 래퍼 (Stage + 3 Layers) |
| `components/board/FieldLayer.tsx` | B2 | 반코트 필드 (정적, 캐시) |
| `components/board/PlayerToken.tsx` | B3 | 선수 토큰 (드래그, 선택, 번호) |
| `components/board/BallToken.tsx` | B4 | 공 토큰 |
| `components/board/TokenLayer.tsx` | B5 | 토큰 레이어 (보간 위치 지원) |
| `components/board/TrailLayer.tsx` | B6 | 트레일 레이어 (재생 중 점선) |
| `hooks/usePlayback.ts` | C1 | 재생 엔진 (rAF + 보간) |
| `components/timeline/Timeline.tsx` | C2 | 타임라인 바 + 재생 컨트롤 |
| `components/timeline/KeyframeMarker.tsx` | C3 | 키프레임 닷 |
| `components/controls/Toolbar.tsx` | D3 | 툴바 (선수 추가, undo/redo, 초기화) |
| `components/Toast.tsx` | D4 | 토스트 알림 |
| `hooks/useCanvasSize.ts` | D1 | 반응형 캔버스 크기 |
| `hooks/useAutoSave.ts` | D2 | 자동저장 상태 감지 |
| `app/page.tsx` | D5 | 메인 페이지 (수정) |
| `app/layout.tsx` | D6 | 레이아웃 (수정) |
| `app/globals.css` | D6 | 글로벌 스타일 (수정) |

---

## 버그 수정 내역

### usePlayback stale closure 버그
- **문제:** `play()` 콜백이 `playbackSpeed` state를 closure로 캡처하여, 재생 중 속도 변경이 반영되지 않음
- **수정:** `speedRef` ref 추가, `cycleSpeed`에서 ref 동기 업데이트, 애니메이션 루프에서 `speedRef.current` 참조

### 재생 ↔ 캔버스 미연동
- **문제:** `page.tsx`에서 `TacticBoard`에 `isPlaying`, `interpolatedPositions` props를 전달하지 않아 재생 애니메이션/트레일이 동작하지 않음
- **수정:** `TacticBoard` props 인터페이스 확장, `page.tsx`에서 playback 상태 전달, 하위 레이어(TokenLayer, TrailLayer)에 props 전파

---

## 검증 체크리스트

- [x] `bun install` — konva + react-konva 설치
- [x] `bun dev` → 브라우저 동작 확인
- [x] 녹색 필드 + 파란 토큰 11개 + 공 표시
- [x] 토큰 드래그 (scale up, shadow, moveToTop)
- [x] 키프레임 추가 → 토큰 이동 → 재생 → 부드러운 보간 애니메이션
- [x] 재생 중 트레일 라인 표시
- [x] 속도 변경 (0.5x / 1x / 2x)
- [x] Ctrl+Z / Ctrl+Shift+Z (undo/redo)
- [x] Space (play/pause)
- [x] Delete (선택된 토큰 삭제)
- [x] 브라우저 리사이즈 → 캔버스 반응형
- [x] 탭 닫고 다시 열기 → localStorage 복원
- [x] `bun lint` — 에러 없음
- [x] `bun test` — 25개 테스트 모두 통과
- [x] `bun run build` — 빌드 성공
