---
name: frontend-react-performance
description: This skill should be used when the user asks to optimize, review, debug, or refactor React or Next.js performance, including data-fetching waterfalls, bundle size, server rendering, re-renders, or loading speed. It is not a general frontend style review.
metadata:
  source: "Adapted from the installed Vercel React Best Practices skill"
---

# React Performance

React와 Next.js의 실제 성능 병목을 찾아 최소 변경으로 개선한다. 일반적인 코드 스타일 리뷰는 `frontend-fundamental-review`를 사용한다.

## 진행

- 프로젝트의 React/Next.js 버전, 렌더링 경계, 데이터 흐름, 기존 의존성을 먼저 확인한다.
- 측정·로그·렌더링 흐름 등 확인 가능한 근거를 우선하고, 추측성 micro-optimization은 제안하지 않는다.
- 동작, SEO, 접근성, 캐시 의미와 에러 처리를 유지한다.
- 새 라이브러리는 기존 의존성으로 해결할 수 없고 효과가 분명할 때만 추가한다.

## 우선순위 기준

### 1. Waterfall 제거

- 서로 독립적인 요청은 `Promise.all` 등으로 병렬화한다.
- 필요한 분기 안에서만 `await`하고, 요청은 가능한 일찍 시작해 결과는 늦게 기다린다.
- 서버 컴포넌트와 API route에서 순차 호출이 생기지 않는지 확인한다.
- 스트리밍이 필요한 화면은 적절한 Suspense 경계를 검토한다.

### 2. 번들 크기

- barrel export보다 실제 모듈을 직접 import한다.
- 무거운 화면·에디터·차트는 실제 사용 시점에 동적 로드한다.
- 분석·로깅 같은 비핵심 third-party 코드는 초기 렌더를 막지 않게 한다.
- 사용하지 않는 의존성이나 설정을 성능 개선 명목으로 새로 만들지 않는다.

### 3. 서버·클라이언트 경계

- 인증과 권한 검사는 서버 경계에서 유지한다.
- Client Component로 넘기는 데이터는 필요한 최소 필드로 줄인다.
- 서버에서 같은 데이터를 중복 조회하거나 직렬화하지 않는지 확인한다.
- 서버 전용 코드가 클라이언트 번들에 들어가지 않게 한다.

### 4. 재렌더링

- effect로 계산할 수 있는 값을 저장하지 말고 렌더 중 파생한다.
- effect 의존성은 필요한 원시 값 중심으로 둔다.
- 입력·이벤트에서 자주 바뀌는 값과 UI 상태를 구분한다.
- 실제로 비싼 작업에만 memoization을 적용한다. `memo`, `useMemo`, `useCallback`을 기본값으로 쓰지 않는다.
- 컴포넌트 내부에 매 렌더마다 새 컴포넌트 정의를 만들지 않는다.

### 5. 렌더링·자료구조

- 조건부 UI의 false 상태와 빈 값 상태를 명시적으로 처리한다.
- 반복 조회가 많은 경우 배열 선형 탐색 대신 기존 코드 스타일에 맞는 `Map`·`Set`을 검토한다.
- 긴 목록은 가상화나 `content-visibility`가 실제 병목인지 확인한 뒤 적용한다.
- 단순한 루프와 early exit로 충분한 곳에 복잡한 추상화를 추가하지 않는다.

## 결과

```md
## 성능 판단

현재 병목과 사용자에게 보이는 영향을 짧게 설명한다.

## 변경 내용

- `path/to/file.tsx:10` - 변경 이유와 기대 효과

## 검증

- 실행한 테스트·빌드·프로파일링·렌더링 확인
- 측정하지 못한 부분
```

- 성능 문제가 없으면 억지로 최적화하지 않는다.
- 리뷰만 요청하면 수정하지 않고 근거와 개선 방향만 제시한다.
- 설명은 한국어로 작성한다.

$ARGUMENTS
