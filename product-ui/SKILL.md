---
name: product-ui
description: Build or revise product UI screens in React-based web projects with a project-derived layout contract, component fallback rules, responsive behavior, browser verification, and anti-slop review. Use for forms, lists, tables, dashboards, details, settings, empty states, and error states; do not use for backend-only work or visual review without implementation.
---

# Product UI

프로젝트마다 다른 기술 스택과 브랜드 표현을 보존하면서, 동일한 레이아웃 책임과 정보 계층으로 제품 화면을 구현한다. 특정 프레임워크, UI 라이브러리, import 경로, 폴더 구조를 가정하지 않는다.

## 1. 프로젝트 탐색

구현 전에 다음을 실제 파일에서 확인한다.

- `package.json`, 실행·빌드·테스트 명령, React/Next.js/Vite와 TypeScript 사용 여부
- 라우팅 파일, 전역 스타일, CSS 변수, 디자인 토큰
- `components`, `ui`, `shared`와 유사한 디렉터리 및 기존 페이지
- 설치된 UI·아이콘·스타일링 라이브러리
- 가까운 기존 화면의 컨테이너 폭, 여백, 타이포그래피, 상태 처리

기존 패턴이 반복되는 규칙인지 한 화면의 우연한 값인지 비교한다. 앱 소스가 여러 개면 수정 대상부터 확인한다.

## 2. 화면 계약 결정

구현 전에 다음을 짧게 정리한다.

1. 사용자가 가장 먼저 해야 할 일과 주요 행동
2. 반드시 보여야 하는 정보와 함께 묶일 콘텐츠
3. 독립된 작업 영역
4. 모바일에서도 유지할 정보와 순서
5. 필요한 loading, error, empty, disabled 상태
6. 화면 유형: `form`, `list/table`, `dashboard`, `detail`, `settings`, `mixed`, `empty state`, `error state`

판단이 어려우면 가장 중요한 사용자 행동을 기준으로 유형을 고른다. 이어서 [references/layout-contract.md](references/layout-contract.md)를 읽고 콘텐츠 폭, 여백, 간격, 컨트롤 크기, 카드·표·모바일 동작을 결정한다.

## 3. 구현체 선택

[references/component-resolution.md](references/component-resolution.md)를 읽고 기존 컴포넌트, 설치된 라이브러리, 기존 CSS, semantic HTML 순으로 해결한다. 실제 export와 import 경로를 확인한 것만 사용한다.

화면 유형에 맞는 논리 구조와 상태는 [references/page-recipes.md](references/page-recipes.md)를 읽는다. recipe는 import 목록이나 고정 템플릿이 아니다.

## 4. 구현

- 대상 프로젝트의 라우팅, 파일 배치, 타입, 스타일 방식을 따른다.
- 브랜드 색상·폰트·반경은 기존 토큰이나 사용자 요청에서 가져온다.
- 토큰이 없으면 임의의 브랜드 결정을 만들지 않는다. 꼭 필요한 중립 local style만 화면 범위에 격리하고 결과에 기록한다.
- 외부 여백은 부모 layout이 소유하게 하고, 반복 형제의 간격은 가능한 한 `gap`으로 관리한다.
- 폼, 표, 키보드 조작, focus와 오류 상태의 기본 접근성을 보존한다.
- 새 dependency, 범용 layout engine, 사용되지 않는 공용 컴포넌트와 추상화를 추가하지 않는다.

## 5. 검증

가능하면 프로젝트의 기존 명령으로 정적 검사와 빌드를 실행하고 실제 브라우저에서 다음을 확인한다.

- 데스크톱과 좁은 화면의 여백, 계층, 줄바꿈, 잘림, 겹침
- 주요 입력·버튼·메뉴 이동과 focus 상태
- loading, error, empty, disabled 상태
- 표 영역의 가로 스크롤과 정보 보존

브라우저나 필요한 상태를 실행할 수 없으면 확인한 범위와 제한을 구분해 보고한다. 실행하지 않은 검증을 통과했다고 말하지 않는다.

## 6. Anti-slop 검수

구현과 첫 브라우저 확인 뒤 현재 환경에서 `kill-ai-slop` 스킬이 실제로 등록되어 있고 호출 가능한지 확인한다.

- 사용 가능: 해당 스킬의 현재 `SKILL.md`를 읽고 그 scan → triage → report → 승인된 최소 수정 → 재검증 절차를 따른다. scanner hit는 판정이 아니라 조사 단서로 취급한다.
- 사용 불가: [references/anti-slop-fallback.md](references/anti-slop-fallback.md)를 읽고 수동 검수한다.

`kill-ai-slop`을 호출하지 못했거나 scanner를 실행하지 않았다면 실행했다고 보고하지 않는다. 브랜드 토큰, 의도된 장식, 상태 표현을 자동으로 제거하지 않는다.

## 결과

다음을 간결하게 보고한다.

- 선택한 화면 유형과 Layout Contract
- 재사용한 기존 컴포넌트·토큰과 추가한 local fallback
- 변경 파일
- 실행한 검증과 관찰 결과
- anti-slop 검수 방식, 유지한 의도적 표현, 확인하지 못한 항목

