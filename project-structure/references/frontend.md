# 프론트엔드 구조

새 React SPA의 대표 배치다. 기존 프로젝트는 실제 경로를 유지한다.

```text
src/
├── app/                         # 앱 초기화·라우팅·Provider
├── pages/<page>/ui/             # 페이지 조합, 필요한 상태만 같은 페이지 model/
├── features/<feature>/
│   ├── index.ts                 # 공개 UI 하나
│   ├── ui/                      # 대표 UI·내부 구성요소·props
│   └── model/                   # 필요한 상태·hook·API·업무 타입·query key
└── shared/{components,ui,hooks,libs,utils}/
```

- React SPA의 app은 페이지를 연결하고 페이지가 feature를 조합한다.
- Next.js는 기존 `app/` 또는 `src/app/`의 라우트에서 조합한다. App Router에 별도의
  `pages/`·`page/`·`router/` 레이어를 추가하지 않는다.
- feature에는 필요한 `ui`·`model`·`index.ts`만 둔다. 렌더링·스타일 helper와 props는
  ui에, 상태·검증·변환·데이터 요청·업무 타입·query key는 model에 둔다.
  단일 기능에 `entities/widgets` 등 별도 레이어를 기본으로 추가하지 않는다.

### 공개 UI와 조합

```ts
// features/reservation-editor/index.ts
export { ReservationEditor } from './ui/ReservationEditor';
```

- index는 자기 ui의 실제 컴포넌트 **하나만 named re-export**한다. default export,
  `export *`, 추가 UI·타입·hook·API·상수·model의 공개 export는 금지한다.
- 외부는 feature index만 사용하고 내부 ui/model 경로를 import하지 않는다.
  내부는 자기 index를 역참조하지 않고 자기 내부 경로를 사용한다.
- 다른 feature의 index도 직접 import하지 않는다. 페이지·라우트가 각 공개 UI를
  가져와 ID·입력값·`onSelect/onSaved` 등의 props·callback으로 연결한다.
- 내부 UI는 여러 개일 수 있다. 외부에서 독립 UI 두 개를 조합해야 하면 feature를
  나누되, 공개 UI가 필요 없는 순수 로직에 빈 UI를 억지로 붙이지 않는다.
- 페이지는 자기 조합 상태·shared를 쓰며 feature model은 직접 가져오지 않는다.
  외부에서 props 타입이 필요하면 공개 UI의 `ComponentProps` 등으로 추론한다.
- 단일 UI 제한은 feature에 적용한다. shared에 같은 제한이나 거대한 루트 barrel을 만들지 않는다.

### 책임과 허용 의존

| 위치 | 책임 | 참조 가능 대상 |
|---|---|---|
| React app | 진입점·라우터·Provider | 페이지·Provider·shared |
| 페이지·Next 라우트 | 기능 간 조합 | feature index·자기 조합 코드·shared |
| feature/ui | 렌더링·입력·내부 UI | 자기 ui·자기 model·shared |
| feature/model | 업무 상태·데이터·검증 | 자기 model·shared |
| shared/components | 조합된 공용 UI | ui·hooks·libs·utils |
| shared/ui | Button·Input 등 기본 UI | hooks·libs·utils |
| shared/hooks | 업무와 무관한 공용 hook | libs·utils |
| shared/libs | HTTP 기반·외부 라이브러리 연결 | utils |
| shared/utils | 순수 함수 | 다른 계층 참조 금지 |

shared의 동일 category 내부 helper도 비순환으로 참조할 수 있다. shared는 feature·페이지를
참조하지 않는다. 한 화면 전용 폼·목록·hook이나 업무 endpoint·query key를 shared의
공용 client·전역 팩토리로 옮겨 경계를 우회하지 않는다.

### Next.js의 실행 경계

- 여러 feature의 초기 입력을 묶는 서버 loader는 라우트가 소유한다. 자기 loader와
  shared 전송 기반을 쓰고, feature model을 가져오거나 feature index에 loader를 공개하지 않는다.
  feature 자체의 데이터 요청은 자기 model에 둔다.
- 서버 라우트는 직렬화 가능한 props를 전달한다. callback·상태 조합은 라우트 소유의
  클라이언트 컴포넌트 안에서 연결하고 클라이언트에서 사용할 수 있는 공개 UI를 가져온다.
- 서버 UI wrapper를 클라이언트에서 import하거나 일반 callback을 서버에서 전달하지 않는다.
  서버 전용 코드와 기존 layout·Provider의 역할을 유지한다.
