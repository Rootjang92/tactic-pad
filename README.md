# TacticPad — 전술 보드

한국 축구 코치를 위한 웹 기반 전술 보드. 선수 토큰을 드래그하고 키프레임 애니메이션으로 전술을 시각화합니다.

## 기술 스택

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- Konva.js (react-konva) — 2D 캔버스
- Zustand — 상태 관리 + localStorage 영속화
- Vitest — 유닛 테스트

## 시작하기

```bash
bun install
bun dev
```

[http://localhost:3000](http://localhost:3000)에서 확인.

## 주요 기능 (Phase 1)

- 축구 반코트 캔버스 (녹색 필드 + 라인)
- 드래그 가능한 선수 토큰 (홈/어웨이 2색, 번호 표시, 최대 22명 + 공 1개)
- 키프레임 애니메이션 타임라인 (최대 10개 키프레임)
- 재생 속도 조절 (0.5x / 1x / 2x)
- 재생 중 이동 궤적 점선 트레일 표시
- Undo/Redo (Ctrl+Z / Ctrl+Shift+Z)
- 키보드 단축키 (Space: 재생/일시정지, Delete: 토큰 삭제)
- localStorage 자동 저장/복원
- 반응형 레이아웃 (데스크톱/태블릿/모바일)
- 4-4-2 기본 포메이션 프리셋
- 한국어 UI

## 스크립트

```bash
bun dev          # 개발 서버
bun run build    # 프로덕션 빌드
bun test         # 유닛 테스트
bun lint         # 린트
```

## 프로젝트 구조

```
app/                  # Next.js App Router
  page.tsx            # 메인 페이지
  layout.tsx          # 루트 레이아웃 (lang="ko")
  globals.css         # 글로벌 스타일

components/
  board/              # Konva 캔버스 컴포넌트
    TacticBoard.tsx   # Stage 래퍼
    FieldLayer.tsx    # 반코트 필드 (정적)
    TokenLayer.tsx    # 선수/공 토큰
    TrailLayer.tsx    # 이동 궤적 트레일
    PlayerToken.tsx   # 선수 토큰
    BallToken.tsx     # 공 토큰
  timeline/           # 타임라인 컨트롤
    Timeline.tsx      # 타임라인 바 + 재생 컨트롤
    KeyframeMarker.tsx
  controls/
    Toolbar.tsx       # 상단 툴바

hooks/
  usePlayback.ts      # 재생 엔진 (rAF + 보간)
  useCanvasSize.ts    # 반응형 캔버스 크기
  useAutoSave.ts      # 자동저장 상태

stores/
  useTacticStore.ts   # Zustand 스토어

lib/
  types.ts            # TypeScript 타입
  constants.ts        # 상수 + 한국어 라벨 + 기본 포메이션
  interpolation.ts    # 선형 보간
```

## 문서

- `docs/design-doc.md` — 제품 디자인 문서
- `docs/phase1-architecture-plan.md` — 아키텍처 플랜
- `docs/phase1-implementation-plan.md` — 구현 계획 + 현황
- `docs/DESIGN.md` — 디자인 시스템

## 로드맵

- **Phase 1** (현재): 프로토타입 — 캔버스 + 토큰 + 키프레임 애니메이션
- **Phase 2**: 코치 관찰 (3-5명 코치에게 프로토타입 전달, 워크플로우 파악)
- **Phase 3**: 풀 MVP — PWA 오프라인, Supabase 백엔드, 계정, 동기화
