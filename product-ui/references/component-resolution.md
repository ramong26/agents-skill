# Component Resolution

레이아웃 기준을 구현체 이름과 분리한다. 공용 컴포넌트가 없어도 동일한 Layout Contract를 semantic HTML과 기존 CSS로 구현한다.

## 선택 우선순위

1. 현재 프로젝트의 기존 컴포넌트
2. 이미 설치되어 실제 사용 중인 UI 라이브러리
3. 현재 프로젝트의 CSS 유틸리티와 공용 스타일
4. semantic HTML
5. 반복되거나 상태가 복잡할 때만 local component

예를 들어 primary action은 `기존 Button → 설치된 라이브러리 Button → native button → 반복될 때만 LocalButton` 순으로 해결한다.

## 확인 절차

- 컴포넌트 정의, export, 실제 사용 예를 검색한다.
- import alias와 경로가 설정 파일 및 기존 import와 일치하는지 확인한다.
- props, variant, 크기, disabled/loading 처리 방식을 실제 타입이나 구현에서 확인한다.
- 공용 컴포넌트의 기본 padding·height와 Layout Contract가 충돌하면 가까운 기존 사용 패턴을 우선하고 차이를 기록한다.
- 컴포넌트 이름에 맞추기 위해 컨테이너 폭이나 섹션 간격을 바꾸지 않는다.

## Native fallback

- action: `<button>` 또는 목적지가 있는 `<a>`
- text input: 연결된 `<label>`과 적절한 `<input type>`
- 선택: 단순 선택은 `<select>`, 복잡한 combobox는 이미 검증된 기존 구현이 있을 때만 사용
- table: 실제 `<table>` 요소군
- grouping: `<main>`, `<section>`, `<header>`, `<form>`, `<fieldset>` 등 의미에 맞는 요소

native fallback도 focus 표시, 키보드 조작, disabled, loading, error 상태를 포함해야 한다. placeholder만 label로 쓰지 않고, 오류는 색상만으로 전달하지 않는다. 비밀번호와 인증 입력은 적절한 `type`과 `autocomplete`을 사용한다.

## 새 컴포넌트 조건

다음 중 하나가 실제로 해당할 때만 만든다.

- 두 곳 이상에서 반복된다.
- 상태 조합이 복잡하다.
- 재사용 가능한 접근성 처리가 필요하다.
- 인라인 구현이 화면의 핵심 흐름을 읽기 어렵게 한다.
- 대상 프로젝트의 기존 추출 기준과 일치한다.

한 번만 쓰는 wrapper, 하나의 구현만 가진 factory, 사용되지 않는 공용 컴포넌트는 만들지 않는다.

## 금지

- 새 UI 또는 아이콘 라이브러리 설치
- 존재하지 않는 컴포넌트나 import 경로 생성
- 실제 사용처 없는 공용 컴포넌트 생성
- 컴포넌트별 외부 margin 추가
- 다른 스타일 시스템 도입
- 미래 사용을 위한 설정 계층이나 adapter 추가

