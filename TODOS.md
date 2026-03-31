# TODOS

## Phase 3

1. **JSON export/import for cross-device sharing**
   - 코치가 사무실 PC → 훈련장 태블릿으로 전술 이동 시 필요.
   - Supabase 동기화와 중복 가능성 있음. Phase 2 코치 관찰 후 결정.
   - Depends on: Phase 2 코치 관찰 결과

2. **Playwright E2E tests for canvas interactions**
   - 캔버스 드래그, 애니메이션, 저장/불러오기 브라우저 테스트.
   - Konva canvas E2E는 작성 난이도 높음. UI 안정화 후 추가.
   - Depends on: Phase 1 UI 안정화

3. ~~**DESIGN.md 디자인 시스템 작성**~~ ✅ 완료
   - `docs/DESIGN.md`에 디자인 시스템 작성됨 (색상, 타이포그래피, 스페이싱, 컴포넌트 패턴).

4. **캔버스 토큰 키보드 네비게이션**
   - Konva 캔버스 내 토큰에 키보드 포커스/네비게이션 추가.
   - 접근성 기본. 키보드로 토큰 선택/이동이 불가능하면 일부 사용자가 제외됨.
   - Konva에서 커스텀 포커스 관리 구현 필요. 복잡도 높음.
   - Depends on: Phase 1 토큰 시스템 안정화

5. **모바일 레이아웃: 툴바 하단 배치**
   - 아키텍처 플랜 명세: 모바일(sm)에서 툴바가 하단 56px로 이동 (thumb zone).
   - 현재 구현: 모든 화면에서 툴바 상단 고정.
   - Phase 1 프로토타입에서는 상단 고정으로 충분. Phase 3 MVP에서 반응형 개선.
