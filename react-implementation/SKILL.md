---
name: react-implementation
description: Implement features, components, or screens in a React SPA. Exclude Next.js, backend work, and styling-only changes.
---

# React SPA Feature Implementation

Next.js가 아닌 React SPA에 요청한 화면이나 기능을 기존 프로젝트의 배치·구현 관례에 맞춰 구현한다.

## 적용 전 확인

- 대상 화면·라우트의 변경에 필요한 데이터 페칭·스타일·별칭을 확인한다.
- 패키지·진입점·provider 설정은 변경에 필요할 때, 비슷한 화면은 관례가 불명확할 때 확인한다.
- 기존 폴더 이름·라우트·공개 API를 존중하고 요청 없이 전체 구조를 이전하지 않는다.

## 구현

- 기존 컴포넌트·훅·타입과 상태 관리 방식을 재사용하고 필요한 코드만 추가한다.
- 화면 간 선택값·저장 후 갱신 등은 기존 props·callback의 타입과 동작 의미에 맞춰 연결한다.
- 기존 fetch 클라이언트와 데이터 페칭 방식을 따른다. provider가 필요하면 실제 진입점에서 연결된 설정을 찾아 재사용한다.
- 기존 스타일과 별칭을 유지한다. 이미 있는 라이브러리와 설정으로 해결할 수 있으면 새 라이브러리나 provider를 추가하지 않는다.

## 검증과 결과

기존 프로젝트의 사용 가능한 lint·타입 검사·build 명령을 실행하고 변경한 화면의 라우트 연결과 상호작용, 필요한 provider 연결을 확인한다.

변경 파일, 재사용한 설정·컴포넌트, 실제 실행한 검증과 미실행 항목을 간단히 보고한다. 실행하지 않은 검증이나 운영 수준의 검증을 완료했다고 표현하지 않는다.
