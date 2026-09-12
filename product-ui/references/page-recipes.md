# Page Recipes

화면 목적에 맞는 논리적 역할과 상태를 선택한다. 아래 이름을 그대로 컴포넌트로 만들거나 특정 import를 사용할 필요는 없다.

## auth-page

목적: 사용자가 로그인, 회원가입 등 하나의 인증 작업에 집중한다.

구조: page container → brand area → heading group → form area → primary action → secondary authentication action → account switch link.

규칙:

- form 기본 폭을 사용하고 하나의 수직 흐름을 만든다.
- Form Layout이 필드 사이 간격을 소유한다.
- 주요 제출 행동과 보조 인증 행동의 우선순위를 구분한다.
- 로그인과 회원가입의 스타일은 공유할 수 있지만 입력 필드와 목적은 분리한다.
- 모바일에서도 요소 순서를 유지한다.

상태: default, focus, validation error, submit error, loading, disabled.

## list-page

목적: 사용자가 항목을 탐색·비교하고 주요 항목 작업을 수행한다.

구조: page container → section header(title, description, primary action) → optional filters/search → list 또는 table container → pagination/continuation.

규칙:

- list/table 기본 폭을 사용한다.
- 필터와 주요 액션을 데이터 영역과 분리하되 같은 업무 흐름으로 묶는다.
- 표는 실제 table 요소를 사용하고 비교 수치는 오른쪽 정렬한다.
- 좁은 화면에서 중요한 열을 임의로 숨기지 않는다. 필요한 경우 데이터 영역만 가로 스크롤한다.

상태: loading, error, empty, filtered-empty, partial data, disabled action.

## detail-page

목적: 하나의 대상에 관한 핵심 정보와 관련 행동을 이해한다.

구조: page container → identity/header group → primary metadata → content sections → related actions.

규칙:

- detail 기본 폭을 사용하고 읽는 순서대로 섹션을 배치한다.
- 메타데이터는 내용과 경쟁하지 않게 작은 계층으로 둔다.
- 독립된 객체가 아니면 섹션을 각각 카드로 만들지 않는다.
- 위험하거나 되돌리기 어려운 행동은 일반 탐색 행동과 분리한다.

상태: loading, not found, error, restricted, editing/saving when relevant.

## settings-page

목적: 사용자가 관련 설정을 이해하고 안전하게 변경한다.

구조: page container → heading group → settings sections → field groups → save feedback → optional danger zone.

규칙:

- settings 기본 폭을 사용한다.
- 같은 설정 업무를 fieldset 또는 section으로 묶고 섹션 간 간격을 크게 둔다.
- 저장 범위가 전역인지 섹션별인지 UI에서 명확하게 한다.
- 위험 작업은 별도 영역으로 분리하되 과한 색상 카드로 장식하지 않는다.

상태: unchanged, dirty, saving, saved, validation error, save error, disabled.

## dashboard-page

목적: 사용자가 상태를 훑고 다음 행동을 결정한다.

구조: page container → heading/context → primary status or work queue → supporting sections → relevant actions.

규칙:

- dashboard 기본 폭을 사용한다.
- 가장 중요한 상태나 작업을 먼저 보여준다.
- 모든 정보를 같은 크기의 통계 카드로 만들지 않는다.
- 수치는 측정 출처와 의미가 있을 때만 표시하고 비교 가능한 숫자는 정렬한다.
- 섹션은 업무 관계와 우선순위에 따라 서로 다른 간격과 계층을 가진다.

상태: loading, partial data, error by section, empty, stale data.

## empty-state

목적: 데이터가 없는 이유와 가능한 다음 행동을 알려준다.

구조: containing section → concise heading → cause/context → one primary next action → optional secondary help.

규칙:

- 화면을 채우기 위한 일러스트, badge, 통계 카드를 만들지 않는다.
- 검색 결과 없음과 최초 데이터 없음처럼 원인별 문구와 행동을 구분한다.
- 할 수 있는 행동이 없다면 거짓 CTA를 만들지 않는다.

상태: first-use empty, filtered empty, permission-limited empty.

## error-state

목적: 실패 내용, 영향, 복구 행동을 사용자가 이해하게 한다.

구조: containing section 또는 page → clear error heading → specific explanation → retry/back/support action as available.

규칙:

- 색상만으로 오류를 표현하지 않는다.
- 실제로 가능한 복구 행동만 제공한다.
- 전체 페이지 실패와 한 섹션 실패의 범위를 구분한다.
- 내부 로그나 민감한 정보를 사용자 문구에 노출하지 않는다.

상태: recoverable, permission, not found, offline, unrecoverable.

