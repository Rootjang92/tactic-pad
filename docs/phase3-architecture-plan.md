# Phase 3 아키텍처 플랜: TacticPad MVP

## Context

TacticPad은 한국 축구 코치를 위한 웹 기반 전술 보드. Phase 1 프로토타입(필드 렌더링, 토큰 드래그, 키프레임 애니메이션, localStorage 저장)이 완성된 상태. Phase 3는 이것을 실제 제품으로 만드는 인프라 전환: 오프라인 지원, 멀티 프로젝트, 계정/동기화, 내보내기.

**수익화는 Phase 4 이후로 미룸.**

---

## 핵심 설계 원칙

1. **IndexedDB가 truth** — Supabase는 sync target, primary store가 아님
2. **점진적 향상** — 계정 없이도 전체 기능 사용 가능 (게스트 = IndexedDB 로컬 전용)
3. **Last-write-wins** — 서버 타임스탬프 기반 충돌 해결 (clock skew 방지)
4. **전체 프로젝트 upsert** — 5KB 데이터에 필드 레벨 diff는 과잉
5. **Solo-dev 현실주의** — CRDT/OT 배제, Supabase 내장 기능 최대 활용

---

## 스코프

### Phase 3 필수
- IndexedDB 전환 + 멀티 프로젝트 라우팅
- Supabase 인증 (이메일/비밀번호) + 게스트→계정 승격
- 동기화 엔진 (exponential backoff, 서버 타임스탬프 LWW)
- PWA 오프라인 퍼스트 (@serwist/next)
- PNG + GIF 내보내기 (modern-gif)

### Phase 3 선택 (시간 허용 시)
- 1-depth 폴더 관리
- 팀 관리 (선수 명단 템플릿)

### NOT in scope (Phase 4+)
- 수익화 (Stripe/Toss, 프리미엄 모델)
- 카카오 소셜 로그인
- 중첩 폴더 구조
- 키프레임 순서 변경 (드래그 정렬)
- 실시간 협업 / 멀티 유저 동시 편집
- 3D 뷰

---

## 데이터 모델 변경

### 확장된 타입 (`lib/types.ts`)

```typescript
// 기존 Token, Keyframe, Position은 유지

interface TacticProject {
  id: string;              // crypto.randomUUID() (기존 Date.now() 교체)
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

type SyncStatus = 'synced' | 'pending' | 'conflict' | 'local-only';

interface Folder {
  id: string;
  name: string;
  parentId: string | null;   // 1-depth만 지원
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

interface Team {
  id: string;
  name: string;              // "서울 FC U-18"
  formation: string;         // "4-4-2", "4-3-3" 등
  players: TeamPlayer[];
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

interface TeamPlayer {
  number: number;            // 등번호
  name: string;              // "김민수"
  position: string;          // "GK", "CB", "ST" 등
}

// 동기화 큐 항목
interface SyncQueueItem {
  id: string;
  table: 'projects' | 'folders' | 'teams';
  recordId: string;
  operation: 'upsert' | 'delete';
  payload: unknown;
  timestamp: string;         // ISO 8601
  retryCount: number;
  status: 'pending' | 'in-flight' | 'failed';
}
```

### generateId() 변경 (`lib/constants.ts`)

```typescript
// 기존: Date.now()-${++idCounter} → 멀티 기기 ID 충돌 위험
// 변경: crypto.randomUUID() → 충돌 없음, 외부 의존성 없음
export function generateId(): string {
  return crypto.randomUUID();
}
```

---

## IndexedDB 스키마 (`lib/db.ts`)

`idb` 라이브러리 사용 (Jake Archibald의 경량 IndexedDB wrapper).

```
tacticpad DB (version 1)
├── projects  (keyPath: id, indexes: by-folder, by-updated, by-sync)
├── folders   (keyPath: id, indexes: by-parent)
├── teams     (keyPath: id)
├── syncQueue (keyPath: id, indexes: by-status, by-timestamp)
└── meta      (keyPath: key)  — 'lastSyncTimestamp', 'migrated', etc.
```

### localStorage → IndexedDB 마이그레이션 (`lib/migration.ts`)

앱 첫 로드 시 한 번 실행. `localStorage['tacticpad-project']` 데이터를 IndexedDB로 이전.
마이그레이션 후에도 localStorage는 삭제하지 않음 (안전망).

```
마이그레이션 흐름:
1. meta store에서 'migrated-from-localstorage' 키 확인
2. 이미 마이그레이션 완료면 스킵
3. localStorage에서 'tacticpad-project' 읽기
4. JSON 파싱 → TacticProject + Phase 3 필드(folderId, userId, syncStatus 등) 추가
5. IndexedDB projects store에 저장
6. meta에 마이그레이션 완료 기록
7. localStorage는 삭제하지 않음 (안전망)
```

---

## Supabase 스키마

```sql
-- 1. profiles (auth.users 확장)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '코치',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. folders (1-depth만)
CREATE TABLE folders (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '새 폴더',
  parent_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_folders_user ON folders(user_id);

-- 3. teams
CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '새 팀',
  formation TEXT NOT NULL DEFAULT '4-4-2',
  players JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teams_user ON teams(user_id);

-- 4. projects (tokens/keyframes는 JSONB)
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '새 전술',
  folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
  team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
  tokens JSONB NOT NULL DEFAULT '[]'::jsonb,
  keyframes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_folder ON projects(folder_id);
CREATE INDEX idx_projects_updated ON projects(user_id, updated_at);

-- RLS: 모든 테이블에 auth.uid() = user_id
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can CRUD own folders" ON folders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own teams" ON teams FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own projects" ON projects FOR ALL USING (auth.uid() = user_id);

-- Trigger: updated_at를 서버 타임스탬프로 자동 설정 (clock skew 방지)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_projects BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_folders BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_teams BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**JSONB 선택 이유:** 프로젝트를 항상 통째로 읽기/쓰기. Join 불필요. Solo dev에게 정규화는 과잉.

---

## Zustand 변경 (`stores/useTacticStore.ts`)

- **persist 미들웨어 제거** — Zustand는 순수 in-memory store
- **loadProject(project) 추가** — IndexedDB에서 프로젝트를 로드하여 store에 세팅
  - **undoStack/redoStack을 빈 배열로 초기화** (프로젝트 간 undo 스택 오염 방지)
- 기존 dispatch, undo, redo 로직은 그대로 유지

```typescript
loadProject: (project: TacticProject) => {
  set({
    project,
    currentKeyframeIndex: 0,
    selectedTokenId: null,
    undoStack: [],     // 프로젝트 전환 시 반드시 초기화
    redoStack: [],
  });
},
```

---

## 동기화 엔진 (`lib/sync.ts`)

### 아키텍처 개요

```
편집 → Zustand → 500ms debounce → IndexedDB 저장
                                      ↓
                             syncQueue에 추가 (coalesce)
                                      ↓
                             3s debounce → triggerSync()
                                      ↓
                           (online?) push + pull
```

### 핵심 동작

- **syncQueue**: IndexedDB의 별도 object store에 저장, 오프라인에서도 유실 없음
- **coalesce**: 같은 record에 대한 pending 항목은 병합 (불필요한 API 호출 방지)
- **exponential backoff**: 1s → 5s → 30s, max 5회 retry 후 failed
- **재접속 시**: failed 항목을 pending으로 리셋 후 재시도
- **Pull**: `updated_at > lastSyncTimestamp`로 서버 변경 fetch
- **LWW 비교**: 서버 `updated_at` (NOW() 트리거) vs 로컬 `updatedAt`
  - 서버가 더 최신 → 서버 데이터로 덮어쓰기
  - 로컬이 더 최신 → 로컬 유지, 다음 push에서 서버 업데이트

### 이중 debounce 전략

- **IndexedDB 저장**: 500ms debounce — 로컬은 빠르게 저장
- **sync 트리거**: 3s debounce — 네트워크 호출 최소화

코치가 토큰을 드래그할 때마다 로컬은 빠르게 저장되고, 네트워크 동기화는 3초마다 한 번만 실행.

### 충돌 해결: Last-Write-Wins

- `updated_at` 서버 타임스탬프를 비교 (clock skew 방지를 위해 서버 NOW() 사용)
- 더 최신 타임스탬프가 승리
- 패배한 쪽은 완전히 덮어씀

**알려진 제한:** 코치가 두 기기에서 동시 편집하면 한쪽 변경이 유실됨.
**수용 가능한 이유:** Solo 사용자, 대부분 한 기기에서만 편집, 동시 편집 시나리오가 매우 드묾.

---

## 인증 (`lib/auth.ts`, `components/auth/`)

- **이메일/비밀번호** (Supabase Auth) — Phase 3 유일한 인증 방식
- **게스트 모드**: 로그인 없이 IndexedDB에 userId=null로 저장
- **게스트→계정 승격**: claimGuestData()가 모든 local-only 데이터에 userId 부여 + syncQueue 추가
- **세션**: Supabase JWT를 localStorage에 캐시 (오프라인에서도 getSession() 가능)

### 게스트 → 계정 승격 흐름

```
[게스트 사용] → IndexedDB에 userId=null로 저장
     ↓
[계정 생성/로그인] → 모든 local-only 프로젝트의 userId를 새 userId로 업데이트
     ↓
[syncQueue에 upsert 작업 추가] → 백그라운드 동기화
```

---

## PWA (`@serwist/next`)

| 리소스 | 전략 | 이유 |
|--------|------|------|
| App Shell (HTML, JS, CSS) | StaleWhileRevalidate | 오프라인에서 즉시 로드, 백그라운드 업데이트 |
| 정적 자산 (폰트, 아이콘) | CacheFirst | 변경 거의 없음 |
| Supabase API 호출 | NetworkOnly | 데이터는 IndexedDB가 primary |

**TODO**: 구현 시 @serwist/next 문서 확인하여 RSC payload 캐싱 전략 상세화 필요.

### PWA manifest

```json
{
  "name": "TacticPad — 전술 보드",
  "short_name": "TacticPad",
  "description": "한국 축구 코치를 위한 전술 보드",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a1a",
  "theme_color": "#1a1a1a",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## 내보내기 (`lib/export.ts`)

- **PNG**: `stage.toDataURL({ pixelRatio: 2 })` — Konva 내장 기능
- **GIF**: `modern-gif` (WASM 기반, ~30KB) — 키프레임 간 보간 프레임을 캡처하여 인코딩
- **stageRef 접근**: TacticBoard에서 `useImperativeHandle`로 exportImage/exportGIF 메서드 노출

---

## 라우팅 구조

```
/                    → 프로젝트 목록 (대시보드)
/project/[id]        → 전술 보드 (기존 page.tsx 내용 이동)
/settings            → 설정 (팀 관리, 계정)
/auth/login          → 로그인
/auth/signup         → 회원가입
```

---

## 파일 구조 변경

### 변경되는 기존 파일
- `stores/useTacticStore.ts` — persist 제거, loadProject 추가
- `lib/types.ts` — SyncStatus, Folder, Team 등 추가
- `lib/constants.ts` — generateId()를 crypto.randomUUID()로 교체, 새 라벨 추가
- `hooks/useAutoSave.ts` — IndexedDB 저장 + syncQueue 연동으로 재작성
- `app/page.tsx` — 프로젝트 목록으로 변환
- `app/layout.tsx` — AuthProvider 래핑
- `components/board/TacticBoard.tsx` — forwardRef + export 메서드 노출
- `components/controls/Toolbar.tsx` — 내보내기 버튼, 프로젝트 이름 편집 추가
- `next.config.ts` — PWA 설정

### 새 파일
```
lib/db.ts                     — IndexedDB 초기화
lib/migration.ts              — localStorage → IndexedDB 마이그레이션
lib/sync.ts                   — 동기화 엔진
lib/sync-helpers.ts           — snake_case ↔ camelCase 변환
lib/supabase-client.ts        — Supabase 브라우저 클라이언트
lib/auth.ts                   — claimGuestData, 인증 관련
lib/project-actions.ts        — 프로젝트 CRUD
lib/export.ts                 — PNG/GIF 내보내기
hooks/useOnlineStatus.ts      — 온라인/오프라인 감지
hooks/useAuth.ts              — Supabase auth 상태
hooks/useProjects.ts          — 프로젝트 목록 로드
components/auth/AuthProvider.tsx
components/auth/LoginForm.tsx
components/auth/SignupForm.tsx
components/projects/ProjectList.tsx
components/projects/ProjectCard.tsx
components/projects/FolderSection.tsx
components/settings/TeamEditor.tsx
components/settings/PlayerList.tsx
components/common/SyncIndicator.tsx
components/common/OfflineBanner.tsx
app/project/[id]/page.tsx     — 전술 보드 (기존 page.tsx 이동)
app/settings/page.tsx
app/auth/login/page.tsx
app/auth/signup/page.tsx
app/manifest.json             — PWA manifest
supabase/migrations/001_initial.sql
.env.local                    — Supabase URL, anon key
```

### 새 의존성
```
production: @supabase/supabase-js, @supabase/ssr, idb, modern-gif
dev: @serwist/next, fake-indexeddb, playwright
```

---

## 구현 순서 (3주)

### Week 1: IndexedDB + 멀티 프로젝트 (가장 어려운 리팩토링)

**Day 1-2: IndexedDB 전환**
1. `idb` 설치, `lib/db.ts` 작성
2. `lib/types.ts` 확장
3. `lib/constants.ts`의 generateId()를 crypto.randomUUID()로 교체
4. `lib/migration.ts` 작성
5. `stores/useTacticStore.ts` 변경: persist 제거, loadProject 추가
6. `hooks/useAutoSave.ts` 재작성: IndexedDB 저장
7. 기존 25개 테스트 수정 + loadProject 테스트 추가

**Day 3-5: 멀티 프로젝트 라우팅**
1. `app/project/[id]/page.tsx` 생성 (기존 page.tsx 이동)
2. `app/page.tsx` → 프로젝트 목록
3. `lib/project-actions.ts` (create, duplicate, delete, rename)
4. `components/projects/ProjectList.tsx`, `ProjectCard.tsx`
5. `hooks/useProjects.ts`
6. 프로젝트 간 이동 테스트 (undo 스택 초기화 확인)

### Week 2: Supabase 인증 + 동기화

**Day 6-7: Supabase 설정 + 인증**
1. Supabase 프로젝트 생성, SQL 마이그레이션 실행
2. `updated_at = NOW()` 트리거 설정
3. `.env.local` 설정
4. `lib/supabase-client.ts`, `lib/auth.ts`
5. `components/auth/` (AuthProvider, LoginForm, SignupForm)
6. 로그인/회원가입 테스트

**Day 8-10: 동기화 엔진**
1. `lib/sync.ts` (enqueueSync, triggerSync, processSyncQueue, pullRemoteChanges)
2. `lib/sync-helpers.ts` (row 변환)
3. `hooks/useOnlineStatus.ts`
4. `hooks/useAutoSave.ts` 최종 수정: 이중 debounce (500ms IndexedDB, 3s sync)
5. `components/common/SyncIndicator.tsx`, `OfflineBanner.tsx`
6. 동기화 유닛 테스트 (fake-indexeddb + Supabase 모킹)

### Week 3: PWA + 내보내기 + QA

**Day 11-12: PWA + 내보내기**
1. `@serwist/next` 설치 + next.config.ts 설정
2. `app/manifest.json`, PWA 아이콘
3. `lib/export.ts` (PNG + GIF)
4. `TacticBoard` forwardRef + useImperativeHandle
5. Toolbar에 내보내기 버튼

**Day 13-14: 폴더 + 팀 관리 (시간 허용 시)**
1. 폴더 CRUD + FolderSection 컴포넌트
2. `app/settings/page.tsx` + TeamEditor + PlayerList
3. 프로젝트 생성 시 팀 연결

**Day 15: QA + 배포**
1. Playwright E2E: 게스트→계정, 오프라인→온라인 핵심 흐름
2. 오프라인 시나리오 수동 테스트
3. Vercel 배포 + Supabase production 설정
4. PWA 설치 테스트 (태블릿)

---

## 기존 코드 재사용

| 기존 코드 | Phase 3에서 |
|-----------|------------|
| `stores/useTacticStore.ts` (persist + single project) | persist 제거, loadProject 추가 |
| `hooks/useAutoSave.ts` (상태 표시만) | IndexedDB + syncQueue로 재작성 |
| `lib/interpolation.ts` | 변경 없음 (GIF 내보내기에서 재사용) |
| `components/board/*` | 최소 변경 (TacticBoard에 forwardRef만) |
| `components/timeline/*` | 변경 없음 |
| `__tests__/tacticStore.test.ts` (25개) | persist 제거에 맞게 수정 |

---

## 테스트 전략

**유닛 테스트 (Vitest + fake-indexeddb):**
- `__tests__/sync.test.ts` — enqueueSync, coalesce, triggerSync, processSyncQueue, pullRemoteChanges
- `__tests__/migration.test.ts` — localStorage→IndexedDB 마이그레이션
- `__tests__/projectActions.test.ts` — CRUD, duplicate ID 리매핑
- `__tests__/auth.test.ts` — claimGuestData
- `__tests__/tacticStore.test.ts` — 기존 25개 수정 + loadProject

**E2E 테스트 (Playwright):**
- 게스트로 전술 작성 → 계정 생성 → 데이터 클라우드 동기화
- 오프라인에서 편집 → 온라인 복귀 → 자동 동기화

---

## 실패 시나리오

| 실패 시나리오 | 테스트 | 에러 처리 | 사용자 경험 |
|-------------|--------|----------|-----------|
| IndexedDB 마이그레이션 실패 | ✓ 유닛 | try/catch, console.error | 새 프로젝트로 시작 (데이터 유실) |
| syncQueue push 실패 | ✓ 유닛 | exponential backoff 5회 | SyncIndicator에 "동기화 실패" 표시 |
| Supabase JWT 만료 | — | getSession() 자동 refresh | 실패 시 재로그인 안내 |
| 오프라인에서 계정 생성 시도 | — | navigator.onLine 체크 | "인터넷 연결이 필요합니다" 토스트 |
| GIF 내보내기 중 메모리 부족 | — | try/catch | "내보내기에 실패했습니다" 토스트 |

---

## 병렬화 전략

| Step | 모듈 | 의존성 |
|------|------|--------|
| A: IndexedDB + store 전환 | lib/, stores/, hooks/ | — |
| B: 멀티 프로젝트 라우팅 | app/, components/projects/ | A |
| C: Supabase 인증 | lib/auth, components/auth/ | A |
| D: 동기화 엔진 | lib/sync* | A, C |
| E: PWA | next.config, public/ | — (독립) |
| F: 내보내기 | lib/export, components/board/ | — (독립) |

**병렬 실행:**
- Lane 1: A → B → D (순차, 공유 상태)
- Lane 2: C (A 완료 후 병렬 가능)
- Lane 3: E + F (완전 독립, 아무 때나 병렬)

---

## 위험 요소

| 위험 | 영향 | 대응 |
|------|------|------|
| @serwist/next + Next.js 16 호환 | PWA 빌드 실패 | 대안: 수동 Service Worker |
| IndexedDB 전환 중 데이터 손실 | 기존 사용자 데이터 유실 | migration.ts + localStorage 보존 |
| 동기화 엔진 복잡도 | 3주 초과 | 전체 upsert로 단순화 완료 |
| modern-gif WASM + Next.js 호환 | GIF 빌드 실패 | 대안: gifenc (순수 JS) |

---

## 검증 체크리스트

1. `bun install` — 새 의존성 설치
2. `bun test` — 모든 유닛 테스트 통과
3. `bun dev` → 기존 기능 정상 동작 (IndexedDB 전환 후)
4. 프로젝트 목록 → 새 전술 생성 → 편집 → 목록 복귀 → 프로젝트 유지
5. 회원가입 → 게스트 데이터 동기화 → 다른 브라우저에서 로그인 → 데이터 확인
6. DevTools Network → Offline → 편집 → Online → 자동 동기화
7. PNG/GIF 내보내기 → 파일 다운로드 확인
8. `bun run build` — 빌드 성공
9. Playwright E2E — 핵심 흐름 통과

---

## 리뷰 결과 요약

**Eng Review:** 2026-04-01 완료, CLEARED

리뷰에서 결정된 사항:
1. PWA 라이브러리: `@serwist/next` (next-pwa 공식 후속작)
2. Zustand persist 제거 + 명시적 IndexedDB I/O
3. 동기화 단위: 전체 프로젝트 upsert (5KB 데이터에 diff는 과잉)
4. 게스트 모드: IndexedDB 로컬 전용 (anonymous auth 불필요)
5. GIF 라이브러리: `modern-gif` (WASM, ~30KB)
6. Retry: exponential backoff (1s/5s/30s, max 5회)
7. Debounce: IndexedDB 500ms + sync 3s 이중 debounce
8. ID 생성: `crypto.randomUUID()` (멀티 기기 충돌 방지)
9. LWW: 서버 타임스탬프 사용 (clock skew 방지)

Outside voice (Claude subagent) 4건 반영:
- undo/redo 스택 프로젝트 전환 시 초기화
- generateId()를 UUID로 교체
- 서버 타임스탬프 기반 LWW
- Week 1 순서 조정 (PWA를 Week 3으로)
