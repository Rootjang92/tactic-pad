# Design System — TacticPad

## Product Context
- **What this is:** 웹 기반 축구 전술 보드. 선수 토큰을 드래그하고 키프레임 애니메이션으로 전술 이동을 시각화.
- **Who it's for:** 한국 축구 코치 (K리그 프로 + 아마추어/유소년)
- **Space/industry:** 스포츠 코칭 도구. 경쟁사: TacticalPad (250만 다운로드, 2010년 UX)
- **Project type:** 캔버스 기반 웹 앱 (도구형)

## Aesthetic Direction
- **Direction:** Industrial/Utilitarian
- **Decoration level:** Minimal
- **Mood:** FIFA 방송 택티컬 오버레이. 다크 크롬이 녹색 필드를 돋보이게 하고, 데이터(토큰, 궤적)가 주인공. 장식 없이 기능만.
- **Anti-patterns:** 퍼플 그라디언트, 3열 아이콘 그리드, 장식적 그림자, 버블리 border-radius, 중앙 정렬 전부

## Typography
- **Display/Hero:** Geist Sans 32px/700 (letter-spacing: -0.02em)
- **Heading:** Geist Sans 20px/600 (letter-spacing: -0.01em)
- **Body:** Geist Sans 16px/400
- **Caption/Labels:** Geist Sans 13-14px/500
- **Data/Tables:** Geist Mono 14px (tabular-nums)
- **Code:** Geist Mono
- **Loading:** Next.js `next/font`로 자동 최적화. 별도 CDN 불필요.
- **Scale:** 11px / 12px / 13px / 14px / 16px / 20px / 24px / 32px

## Color

### Approach: Restrained
색상은 의미가 있을 때만 사용. 팀 구분(파란/빨간), 필드(녹색), 상태(성공/경고/에러) 외에 불필요한 색상 없음.

### Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--app-bg` | `#1a1a1a` | 앱 배경 (순수 검정 아님) |
| `--toolbar-bg` | `#242424` | 툴바 배경 |
| `--timeline-bg` | `#1f1f1f` | 타임라인 바 |
| `--surface` | `#2a2a2a` | 카드/입력 필드 배경 |
| `--surface-hover` | `#333333` | 호버 상태 |
| `--border` | `#3a3a3a` | 구분선 |
| `--field-green` | `#2d8a4e` | 축구 필드 |
| `--field-line` | `#ffffff` | 필드 라인 |
| `--home` | `#2563eb` | 홈 팀 (파란) |
| `--home-light` | `#3b82f6` | 홈 팀 호버/액티브 |
| `--away` | `#dc2626` | 어웨이 팀 (빨간) |
| `--away-light` | `#ef4444` | 어웨이 팀 호버/액티브 |
| `--ball` | `#fbbf24` | 공 |
| `--text-primary` | `#ffffff` | 기본 텍스트 |
| `--text-secondary` | `#a1a1aa` | 보조 텍스트 |
| `--text-muted` | `#71717a` | 비활성 텍스트 |
| `--success` | `#22c55e` | 성공 (저장 완료) |
| `--warning` | `#f59e0b` | 경고 |
| `--error` | `#ef4444` | 에러 |
| `--info` | `#3b82f6` | 정보 |

### WCAG AA Contrast
- 토큰 번호(흰색) on 파란(#2563eb): 4.6:1 ✓
- 토큰 번호(흰색) on 빨간(#dc2626): 4.5:1 ✓
- 필드 라인(흰색) on 녹색(#2d8a4e): 4.2:1 ✓
- 툴바 텍스트(흰색) on 다크(#242424): 14.5:1 ✓

### Dark Mode
다크 모드가 기본이자 유일한 모드. 라이트 모드 없음. 전술 보드는 다크 배경이 표준.

## Spacing
- **Base unit:** 4px
- **Density:** Compact (도구형 앱)
- **Scale:** 2xs(2px) xs(4px) sm(8px) md(16px) lg(24px) xl(32px) 2xl(48px) 3xl(64px)

## Layout
- **Approach:** Hybrid (캔버스 자유형 + 크롬 그리드)
- **Grid:** 단일 컬럼 (전술 보드는 풀스크린 캔버스)
- **Max content width:** 1280px (데스크톱)
- **Border radius:** sm:4px, md:6px, lg:12px, full:9999px (토큰)

### Viewport Allocation
- 데스크톱: Toolbar 48px + Field 70%+ + Timeline 48px
- 모바일: Field 75% + Timeline 44px + Bottom Bar 56px
- Toolbar + Timeline 합계는 뷰포트 30%를 초과하지 않음

### Breakpoints
- sm (≤639px): 모바일. 하단 바 툴바.
- md (640-1023px): 태블릿. 상단 툴바.
- lg (≥1024px): 데스크톱. 상단 툴바 + 중앙 정렬 필드.

## Tokens (Player/Ball)
- **Player radius:** 18px (hit area: 44px via hitStrokeWidth)
- **Ball radius:** 10px
- **Number font:** 13px Geist Sans, white
- **Shadow (rest):** blur 2, offset 1, opacity 0.15
- **Shadow (drag):** blur 8, offset 3, opacity 0.3
- **Drag scale:** 1.15x (100ms ease-out)
- **Selected state:** 밝은 링/글로우
- **Disabled (playback):** opacity 0.6
- **Z-order:** 마지막 드래그된 토큰 최상위

## Trail Lines
- **Color:** #ffffff, opacity 0.4
- **Pattern:** dash [6, 4]
- **Width:** 2px

## Timeline Bar
- **Height:** 48px
- **Keyframe dot radius:** 6px
- **Dot inactive:** #525252
- **Dot active:** #3b82f6
- **Scrubber:** #ffffff, 2px width

## Motion
- **Approach:** Minimal-functional
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(100ms) short(200ms) medium(500ms)
- **Drag feedback:** scale 1.15x, 100ms ease-out
- **Keyframe add:** dot scale-up 0→1.0, 200ms
- **Auto-save indicator:** ✓ fade in/out, 500ms
- **Playback:** linear interpolation, 1000ms per keyframe at 1x

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-31 | Initial design system | /design-consultation. Industrial/utilitarian, FIFA broadcast tactical overlay. |
| 2026-03-31 | Geist 단독 사용 | Next.js 내장 폰트. 추가 로딩 없이 빠름. 한국어 지원 양호. |
| 2026-03-31 | 다크 모드 전용 | 전술 보드 카테고리 표준. 녹색 필드가 다크 배경에서 선명. |
| 2026-03-31 | 장식 최소화 | 도구형 앱은 기능 우선. 그라디언트/그림자/보더 장식 없음. |
