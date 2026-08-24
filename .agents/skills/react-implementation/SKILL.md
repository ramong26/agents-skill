---
name: react-implementation
description: This skill should be used when the user asks to implement, add, or scaffold a new feature or component in a plain React SPA (Vite or similar, NOT Next.js) — e.g. "React 컴포넌트 만들어줘", "이 화면 구현해줘", "add a new feature/component to the React app". It generates feature-sliced component/hook/api files. Do not use for Next.js App Router projects (use nextjs-implementation instead), backend work, or simple styling tweaks.
---

# React (non-Next.js) Feature Implementation

> 이 스킬은 실제 프로젝트 코드에서 추출한 게 아니라 일반적인 React 커뮤니티 관례로
> 작성됐다. 실제로 이 스택을 쓰는 레포가 생기면 그 코드를 기준으로 다시 다듬는다.
> 그 전까지는 아래 구조를 기본값으로만 쓰고, 대상 레포에 이미 다른 컨벤션이 있으면
> 그것을 우선한다.

## 레이어 구조 (Feature-Sliced Design 기반)

```text
src/
├── pages/<page>/
│   ├── index.ts
│   └── ui/<Page>.tsx
├── widgets/<widget>/
│   ├── index.ts
│   └── ui/<Widget>.tsx
├── entities/<entity>/
│   ├── index.ts
│   ├── api/<entity>-api.ts     # fetch 함수
│   ├── api/use<Entity>Query.ts  # react-query queryOptions 또는 커스텀 훅
│   └── model/<entity>-type.ts
└── shared/
    ├── ui/
    ├── lib/
    └── constants/
```

## 임포트 경계

- 각 슬라이스는 `index.ts`로 노출한 것만 다른 슬라이스에서 가져다 쓴다.
- 라우팅(`react-router` 등)은 `pages/`를 연결하는 역할만 하고 화면 로직을 직접 두지 않는다.

## 데이터 페칭

- 서버 상태에는 `@tanstack/react-query`(또는 레포에 이미 있는 라이브러리)를 쓴다. 새 라이브러리를 추가하기 전에 레포에 이미 쓰는 게 있는지 `package.json`을 먼저 확인한다.
- 쿼리 키는 엔티티 단위로 중앙 관리한다 (`shared/constants/queryKey.ts` 같은 파일에 `all`/`lists()` 팩토리).

## 컴포넌트

- 컴포넌트는 최대한 얇게: 데이터/상태 로직은 훅으로 분리하고 컴포넌트는 렌더링에 집중한다.
- props 타입은 컴포넌트 파일 안에 인터페이스로 선언한다.
- 스타일은 레포에 이미 있는 방식(Tailwind, CSS Module 등)을 따른다. 새 스타일링 방식을 도입하지 않는다.

## 결과

새로 만든 파일 목록(레이어별로 구분), 재사용한 기존 유틸/컴포넌트, 실행한 검증(lint·build)을 정리해 보여준다.
