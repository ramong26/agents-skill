---
name: nextjs-implementation
description: Implement pages, features, or screens in Next.js App Router. Exclude React SPAs, backend work, and styling-only changes.
---

# Next.js (App Router) Feature Implementation

Next.js App Router의 기존 배치·구현 관례와 서버·클라이언트 경계를 유지하며 요청한 화면이나 기능을 구현한다.

## 적용 전 확인

- 대상 라우트의 변경에 필요한 버전·별칭·데이터 페칭·스타일을 확인한다.
- 연결된 layout·provider는 변경과 관련될 때, 비슷한 화면은 관례가 불명확할 때 확인한다.
- 기존 App Router 위치·폴더 이름·라우트 그룹·동적 세그먼트·공개 API를 존중하고 요청 없이 전체 구조를 이전하지 않는다.

## 구현

- 기존 컴포넌트·훅·타입과 구현 방식을 재사용하고 필요한 코드만 추가한다.
- 서버 컴포넌트와 클라이언트 컴포넌트의 기존 역할을 유지한다. 훅·상호작용에 필요한 최소 UI에만 `'use client'`를 두고 서버 전용 코드가 클라이언트에 섞이지 않게 한다.
- 서버·클라이언트 사이 props는 직렬화 가능한 값으로 전달하며, 상호작용 callback은 클라이언트 경계 안에서 연결한다. 서버 loader나 서버 전용 컴포넌트를 클라이언트에서 가져오지 않는다.
- 기존 서버 fetch, fetch 클라이언트, TanStack Query 등 실제 사용 중인 방식을 따른다. provider는 고정 경로를 가정하지 않고 layout부터 실제 연결을 찾아 재사용한다.
- `params`·`searchParams` 타입과 비동기 처리는 확인한 Next.js 버전에 맞춘다.
- 기존 스타일과 별칭을 유지한다. 이미 있는 라이브러리와 설정으로 해결할 수 있으면 새 라이브러리나 provider를 추가하지 않는다.

## 검증과 결과

기존 프로젝트의 사용 가능한 lint·타입 검사·build 명령을 실행하고 변경한 화면의 라우트 연결·상호작용, 서버·클라이언트 경계와 필요한 provider 연결을 확인한다.

변경 파일, 재사용한 설정·컴포넌트, 실제 실행한 검증과 미실행 항목을 간단히 보고한다. 실행하지 않은 검증이나 운영 수준의 검증을 완료했다고 표현하지 않는다.
