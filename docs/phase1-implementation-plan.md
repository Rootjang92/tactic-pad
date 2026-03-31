# Phase 1 구현 계획: TacticPad 프로토타입

## Context

TacticPad Phase 1 프로토타입을 구현합니다. 아키텍처 플랜(`docs/phase1-architecture-plan.md`)과
디자인 리뷰가 완료된 상태이며, Eng + Design 모두 CLEAR. 플랜에 정의된 데이터 모델, 비주얼 상수,
인터랙션 스펙, 상태 매트릭스를 그대로 구현합니다.

**패키지 매니저:** bun (npm 아님)

**참고:** `lib/types.ts`가 이미 생성됨 (이전 구현 시도에서). npm으로 konva/react-konva도
설치되었으나 bun으로 재설치 필요.

---

## 정리 작업 (구현 시작 전)

1. `rm -rf node_modules package-lock.json` (npm 잔여물 제거)
2. `rm lib/types.ts` (이미 생성된 파일 제거, Step A에서 다시 작성)
3. `bun add konva react-konva`
4. `bun add -d vitest @testing-library/react @vitejs/plugin-react jsdom`

---

## Step A: 데이터 모델 + 리듀서 + 테스트 (기반 레이어)

의존성: 없음. 모든 후속 단계의 기반.

### A1. 타입 정의
- **파일:** `lib/types.ts`
- TacticProject, Token, Keyframe, Position, ProjectState, PlaybackState, ProjectAction
- 플랜 §Data Model + §State Management 그대로

### A2. 상수 정의
- **파일:** `lib/constants.ts`
- 플랜 §Visual Design Constants 전체 (APP_BG, FIELD_GREEN, TOKEN_RADIUS 등)
- 한국어 UI 라벨 (§Korean UI)
- 4-4-2 기본 포메이션 좌표 (§First-Run Experience)
  - 정규화 좌표 (0-1)로 GK(1)~ST(11) + 공 위치 정의
  - `createDefaultProject()` 함수: 기본 TacticProject 생성

### A3. 리듀서
- **파일:** `hooks/useTacticState.ts`
- projectReducer: 모든 ProjectAction 처리
  - MOVE_TOKEN: currentKeyframe.positions[tokenId] 업데이트
  - ADD_TOKEN: tokens 배열 추가 + 현재 키프레임에 position 설정 + 다른 키프레임에도 동일 위치
  - REMOVE_TOKEN: tokens 배열에서 제거 + 모든 키프레임 positions에서 제거
  - ADD_KEYFRAME: 이전 키프레임 positions 복사, max 10개 제한
  - DELETE_KEYFRAME: 최소 1개 유지, positions 정리
  - SELECT_KEYFRAME: currentKeyframeIndex 변경
  - SELECT_TOKEN: selectedTokenId 변경
  - LOAD_PROJECT: 전체 교체
  - CLEAR: createDefaultProject()로 리셋 (빈 상태가 아닌 4-4-2로)
  - SET_NAME: project.name 변경
- Undo/Redo: undoStack/redoStack (max 50)

### A4. 보간 함수
- **파일:** `lib/interpolation.ts`
- `interpolatePositions(from, to, progress)`: 두 키프레임 간 선형 보간
- progress: 0.0~1.0
- 한쪽에만 있는 토큰: 있는 쪽 위치 그대로 사용

### A5. 스토리지
- **파일:** `lib/storage.ts`
- `saveProject(project)`: localStorage에 JSON 저장, try/catch
- `loadProject()`: localStorage에서 로드, 실패 시 null 반환
- key: `"tacticpad-project"`

### A6. Context Provider
- **파일:** `providers/TacticProvider.tsx`
- `"use client"` 디렉티브
- ProjectState + dispatch를 Context로 제공
- 마운트 시 localStorage에서 로드, 없으면 createDefaultProject()

### A7. 유닛 테스트
- **파일:** `__tests__/tacticReducer.test.ts`
  - 모든 리듀서 액션 테스트 (MOVE, ADD, REMOVE, keyframe CRUD, CLEAR, undo/redo)
  - 엣지 케이스: max tokens(23), max keyframes(10), delete last keyframe 방지
- **파일:** `__tests__/interpolation.test.ts`
  - 선형 보간 정확도, progress 0/0.5/1, 한쪽에만 있는 토큰
- **파일:** `__tests__/storage.test.ts`
  - save/load 왕복, localStorage 실패 시 에러 핸들링
- **설정:** `vitest.config.ts` 생성 (jsdom 환경)

**검증:** `bun test` — 모든 유닛 테스트 통과

---

## Step B: Konva 캔버스 + 필드 + 토큰

의존성: Step A (types, constants, reducer)

### B1. 캔버스 래퍼
- **파일:** `components/board/TacticBoard.tsx`
- `"use client"` + dynamic import로 react-konva Stage 로드
- SSR 방지: `dynamic(() => import(...), { ssr: false })`
- 로딩 중: 스켈레톤 필드 아웃라인 (§Interaction State Matrix - LOADING)
- `aria-label="전술 보드 캔버스"` 설정
- `touch-action: none` 컨테이너에 적용

### B2. 필드 레이어
- **파일:** `components/board/FieldLayer.tsx`
- Konva Layer + `listening(false)`
- 반코트 라인: 외곽선, 페널티 에어리어, 골 에어리어, 센터 서클 아크
- 색상: FIELD_GREEN 배경, FIELD_LINE_COLOR 라인, FIELD_LINE_WIDTH 두께
- 필드 패딩: FIELD_PADDING (16px)
- 레이어 캐시: `layer.cache()` 호출하여 정적 렌더링

### B3. 선수 토큰
- **파일:** `components/board/PlayerToken.tsx`
- Konva Group: Circle(TOKEN_RADIUS, HOME_COLOR/AWAY_COLOR) + Text(번호)
- 드래그: `draggable={!isPlaying}`
- 드래그 시: scale 1.15x, shadow 증가 (§Interaction Quality Spec)
- 드래그 끝: scale 복원, shadow 복원, 정규화 좌표로 변환 → dispatch MOVE_TOKEN
- 선택 상태: 밝은 링/글로우 (§Token Interaction Design)
- 선택 시 삭제 버튼(✕) 표시
- 비활성: opacity 0.6, draggable false (재생 중)
- 필드 범위 내로 드래그 제한 (dragBoundFunc)
- z-order: 마지막 드래그된 토큰이 최상위 (moveToTop)

### B4. 공 토큰
- **파일:** `components/board/BallToken.tsx`
- PlayerToken과 유사하나 BALL_RADIUS(10px), BALL_COLOR, 번호 없음

### B5. 토큰 레이어
- **파일:** `components/board/TokenLayer.tsx`
- Konva Layer: 모든 PlayerToken + BallToken 렌더링
- 현재 키프레임의 positions를 정규화→픽셀 변환하여 전달
- 재생 중: interpolatedPositions 사용
- 빈 필드 탭: selectedTokenId를 null로 (deselect)

### B6. 트레일 레이어
- **파일:** `components/board/TrailLayer.tsx`
- Konva Layer + `listening(false)`
- 재생 중에만 표시: 각 토큰의 시작→현재 위치까지 점선(TRAIL_DASH)
- 색상: TRAIL_COLOR, opacity: TRAIL_OPACITY

**검증:** `bun dev` → 브라우저에서 녹색 필드 + 파란 토큰 11개 + 공 보임, 드래그 동작 확인

---

## Step C: 타임라인 + 재생 컨트롤

의존성: Step A (reducer, types). Step B와 병렬 가능하나 순차 진행이 현실적.

### C1. 재생 엔진
- **파일:** `hooks/usePlayback.ts`
- isPlaying, playbackSpeed, interpolatedPositions 관리
- play(): 토큰 잠금 + rAF 루프 시작
- pause(): rAF 중단, 현재 보간 위치 유지
- seek(keyframeIndex): 해당 키프레임으로 점프
- rAF 루프: elapsed time 기반 progress 계산, interpolatePositions 호출
- 키프레임 간 전환: 1000ms (1x), 2000ms (0.5x), 500ms (2x)
- 마지막 키프레임 도달: 정지 + 토큰 잠금 해제

### C2. 타임라인 바
- **파일:** `components/timeline/Timeline.tsx`
- 48px 높이, TIMELINE_BG 배경
- 키프레임 닷(KeyframeMarker): KEYFRAME_DOT_RADIUS, 클릭으로 seek
- 스크러버: 현재 위치 표시 (SCRUBBER_COLOR)
- 재생 중: 닷이 순차적으로 하이라이트
- 키프레임 추가 버튼: 새 닷 추가 + scale-up 애니메이션 200ms
- 키프레임 삭제 버튼: 현재 키프레임 삭제 (최소 1개 유지)

### C3. 키프레임 마커
- **파일:** `components/timeline/KeyframeMarker.tsx`
- 개별 키프레임 닷 컴포넌트
- 비활성: KEYFRAME_DOT_COLOR, 활성: KEYFRAME_DOT_ACTIVE
- 클릭: dispatch SELECT_KEYFRAME
- 최소 터치 타겟 44px

### C4. 재생 컨트롤 (타임라인 바에 통합)
- Play/Pause 버튼: 토글, 최소 44px 터치 타겟
- 속도 순환 버튼: "×1" 표시, 탭으로 0.5x→1x→2x→0.5x 순환
- 키프레임 1개일 때: Play 버튼 회색(비활성)

**검증:** 키프레임 2개 이상 추가 후 재생 → 토큰이 부드럽게 이동, 트레일 라인 표시

---

## Step D: 반응형 + 자동저장 + 통합 폴리시

의존성: Step A + B 완료 후

### D1. 반응형 캔버스
- **파일:** `hooks/useCanvasSize.ts`
- ResizeObserver로 컨테이너 크기 감지
- FIELD_ASPECT_RATIO(1.2) 유지하며 최대 크기 계산
- 반환: { width, height, scale }
- 뷰포트에서 toolbar(48px) + timeline(48px) 빼고 남은 공간 사용

### D2. 자동저장
- **파일:** `hooks/useAutoSave.ts`
- 500ms debounce로 project 상태를 localStorage에 저장
- 저장 성공: green ✓ 0.5초 표시 (콜백으로 UI에 알림)
- 저장 실패: 에러 콜백

### D3. 툴바
- **파일:** `components/controls/Toolbar.tsx`
- 데스크톱: 상단 48px. 모바일(sm): 하단 56px
- 버튼: [홈 선수 추가][어웨이 선수 추가][공 추가][되돌리기][다시 실행][초기화]
- 초기화: 확인 다이얼로그 "모두 초기화?" [확인][취소]
- 재생 중: 추가/초기화 비활성
- 선수 추가: 다음 미사용 번호 자동 할당, max 11 per team
- 모든 버튼 최소 44px 터치 타겟
- Tab으로 포커스 가능, Enter/Space로 활성화

### D4. 토스트
- **파일:** `components/Toast.tsx`
- 에러 토스트: TOAST_BG(빨간), 닫기 버튼, 한국어 메시지
- 저장 확인: SAVE_ICON_COLOR(초록 ✓), 자동 fade out

### D5. 메인 페이지 통합
- **파일:** `app/page.tsx` (기존 보일러플레이트 교체)
- TacticProvider로 래핑
- 레이아웃: Toolbar(top/bottom) + TacticBoard(center) + Timeline(bottom)
- 반응형 분기: `useMediaQuery` 또는 Tailwind sm/md/lg
- 키보드 단축키: Ctrl+Z(undo), Ctrl+Shift+Z(redo), Space(play/pause)
- 첫 실행 툴팁: "토큰을 드래그해서 위치를 조정하세요" (3초 후 fade out)

### D6. 레이아웃 + 스타일
- **파일:** `app/layout.tsx` 수정
  - `lang="ko"` 설정
  - metadata: title "TacticPad", description 한국어
- **파일:** `app/globals.css` 수정
  - APP_BG, TOOLBAR_BG 등 CSS 변수 추가
  - 다크 테마 기본 적용

**검증:**
1. `bun dev` → 전체 앱 동작 확인
2. 필드에서 토큰 드래그, 키프레임 추가, 재생, 속도 변경
3. 브라우저 리사이즈 → 캔버스 반응형 확인
4. 모바일 뷰포트(375px) → 하단 바 툴바 확인
5. 탭 닫고 다시 열기 → localStorage 복원 확인
6. `bun lint` — 에러 없음
7. `bun test` — 모든 유닛 테스트 통과

---

## 실행 순서 요약

```
A (기반) ──→ B (캔버스) ──→ D (통합)
         └─→ C (타임라인) ──┘
```

A 완료 후 B와 C는 독립적이나, 1인 개발이므로 A → B → C → D 순차 진행 권장.

---

## 파일 목록 (총 ~20개 신규/수정)

| 파일 | Step | 설명 |
|------|------|------|
| `lib/types.ts` | A1 | 타입 정의 |
| `lib/constants.ts` | A2 | 비주얼 상수 + 한국어 라벨 + 기본 포메이션 |
| `hooks/useTacticState.ts` | A3 | 리듀서 + undo/redo |
| `lib/interpolation.ts` | A4 | 선형 보간 |
| `lib/storage.ts` | A5 | localStorage 래퍼 |
| `providers/TacticProvider.tsx` | A6 | Context provider |
| `vitest.config.ts` | A7 | 테스트 설정 |
| `__tests__/tacticReducer.test.ts` | A7 | 리듀서 테스트 |
| `__tests__/interpolation.test.ts` | A7 | 보간 테스트 |
| `__tests__/storage.test.ts` | A7 | 스토리지 테스트 |
| `components/board/TacticBoard.tsx` | B1 | 캔버스 래퍼 |
| `components/board/FieldLayer.tsx` | B2 | 반코트 필드 |
| `components/board/PlayerToken.tsx` | B3 | 선수 토큰 |
| `components/board/BallToken.tsx` | B4 | 공 토큰 |
| `components/board/TokenLayer.tsx` | B5 | 토큰 레이어 |
| `components/board/TrailLayer.tsx` | B6 | 트레일 레이어 |
| `hooks/usePlayback.ts` | C1 | 재생 엔진 |
| `components/timeline/Timeline.tsx` | C2 | 타임라인 바 |
| `components/timeline/KeyframeMarker.tsx` | C3 | 키프레임 닷 |
| `components/controls/Toolbar.tsx` | D3 | 툴바 |
| `components/Toast.tsx` | D4 | 토스트 알림 |
| `hooks/useCanvasSize.ts` | D1 | 반응형 캔버스 크기 |
| `hooks/useAutoSave.ts` | D2 | 자동저장 |
| `app/page.tsx` | D5 | 메인 페이지 (수정) |
| `app/layout.tsx` | D6 | 레이아웃 (수정) |
| `app/globals.css` | D6 | 글로벌 스타일 (수정) |

---

## 주의사항

- `bun` 사용 (npm/yarn 아님)
- `lib/types.ts`는 이전 시도에서 이미 생성됨 — Step A1에서 덮어쓰기
- `node_modules`와 `package-lock.json`은 npm 잔여물이므로 정리 후 `bun install`로 재설치
- react-konva는 `"use client"` + `dynamic import(ssr: false)` 필수
- 모든 Konva 컴포넌트는 클라이언트 컴포넌트
- 플랜의 PlaybackControls는 Timeline에 통합 (별도 컴포넌트 아님)
