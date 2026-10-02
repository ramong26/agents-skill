# 경계 검사 예시

선택한 스택의 구조 규약을 보조하는 검사 예시다. 아래는 대상 레포에
이미 설치된 도구에 적용할 **부분 검사 예시**이며 새 검사기나 의존성을 자동 추가하지
않는다. 실제 소스 루트·별칭·기능 이름과 설치된 도구 버전에 맞춰 사용한다.

## 프론트: ESLint의 별칭 import 제한

기존 TypeScript parser 설정 뒤에 다음 flat-config 항목을 추가한다. 이 예시는 `@/`가
`src/`를 가리키고 `payment` feature가 있다고 가정한다. feature별 규칙은 실제 feature
목록에 맞춰 추가한다. `patterns.regex`를 지원하는 ESLint에서 사용한다.

```js
// eslint.config.js의 기존 설정에 합칠 예시
const featureBase = [
  "^@/(?:app|pages)(?:/|$)",
  "^@/features/(?!payment(?:/|$))",
  "^@/features/payment(?:/index(?:\\.ts)?)?$",
];

const restrict = (regexes) => ["error", {
  patterns: regexes.map(regex => ({ regex, caseSensitive: true })),
}];

const shared = ["components", "ui", "hooks", "libs", "utils"];

export default [
  {
    files: ["src/features/payment/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": restrict(featureBase) },
  },
  {
    files: ["src/features/payment/model/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrict([
        ...featureBase,
        "^@/features/payment/ui(?:/|$)",
      ]),
    },
  },
  {
    files: ["src/pages/**/*.{ts,tsx}", "src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrict([
        "^@/features/[^/]+/(?!index(?:\\.ts)?$)",
      ]),
    },
  },
  ...shared.map((segment, index) => ({
    files: [`src/shared/${segment}/**/*.{ts,tsx}`],
    rules: {
      "no-restricted-imports": restrict([
        "^@/(?:app|pages|features)(?:/|$)",
        ...(index ? [
          `^@/shared/(?:${shared.slice(0, index).join("|")})(?:/|$)`,
        ] : []),
      ]),
    },
  })),
];
```

자기 feature의 정상적인 별칭 내부 참조까지 막는 `@/features/**` 일괄 금지를 쓰지 않는다.
기존 `no-restricted-imports` 규칙이 있으면 패턴을 합쳐 기존 제한을 지운 상태로 덮어쓰지
않는다. 이 예시에서는 model override가 feature 공통 제한을 함께 포함한다.

**검출 범위:** 열거한 feature의 별칭을 사용한 정적 import·re-export에서 feature 간
참조, 자기 index 참조, model → ui, 페이지의 내부 접근과 shared 역방향 참조를 제한한다.

**미검출 범위:** 상대 경로·다른 별칭의 실제 목적지, 동적 import, 순환, 단일 UI export
개수와 UI 심볼의 의미. `model → ../ui/Card`는 위 문자열 패턴으로 잡히지 않는다.
타입 import도 구조 규칙상 같은 제한을 적용하며 타입 전용 우회 허용을 추가하지 않는다.

기존 resolver 기반 architecture 도구가 있으면 실제 경로를 해석해 나머지 경계도
검사한다. 없으면 해당 접근과 index의 단일 named UI 재수출을 직접 확인하고 자동
검증이 끝났다고 보고하지 않는다. [ESLint 공식 규칙](https://eslint.org/docs/latest/rules/no-restricted-imports)

## FastAPI: 기존 import-linter의 계층·독립성 계약

아래는 `app.modules.order/payment`와 `app.usecases/shared`가 실제로 존재하는 패키지
예시다. 실제 모듈을 빠짐없이 열거하고 import 가능한 package 구성에서 실행한다.

```ini
# .importlinter
[importlinter]
root_package = app

[importlinter:contract:application-layers]
name = Application dependencies flow downward
type = layers
layers =
    app.main
    app.usecases
    app.modules
    app.shared

[importlinter:contract:independent-modules]
name = Business modules are independent
type = independence
modules =
    app.modules.order
    app.modules.payment

[importlinter:contract:module-layers]
name = Module dependencies flow downward
type = layers
containers =
    app.modules.order
    app.modules.payment
layers =
    public
    router
    service
    (repository)
    (models) | schemas
```

`public`은 router/service의 정상적인 재수출을 허용하도록 최상위에 둔다. `models`와
`schemas`는 서로 참조하지 않는 독립적인 최하위 계층이다. 괄호는 없는 파일을 생략할
수 있는 optional layer다. router·schemas·usecases·shared도 존재 여부에 맞춰 생략하거나
optional로 설정한다. 새 모듈이 생기면 목록을 함께 갱신한다.

**검출 범위:** 열거한 업무 모듈 사이의 의존, 계층 역방향 참조, modules → usecases/main,
shared → 상위 애플리케이션 참조. [계층 계약](https://import-linter.readthedocs.io/en/stable/contract_types/layers/),
[독립성 계약](https://import-linter.readthedocs.io/en/stable/contract_types/independence/)

**미검출 범위:** main/usecase가 반드시 모듈 public만 쓰는지, router가 repository를
건너뛰어 호출하는지, 열거하지 않은 새 모듈. 이 부분은 별도 기존 계약이나 실제 import
리뷰로 확인한다. `__all__` 역시 내부 접근을 차단하지 않는다.

설치된 도구가 있을 때 대상 프로젝트 환경에서 `lint-imports`를 실행한다. 도구가 없으면
실제 import를 수동으로 확인한 범위를 보고한다. 도입안을 의무 제안하지 않으며,
실행하지 않은 검사가 통과했다고 주장하지 않는다.

## 확인 시나리오

| 사례 | 구조 규칙 | 위 예시만으로 확인 가능한가 |
|---|---|---|
| payment UI → 자기 model 별칭 | 허용 | 프론트 패턴의 허용 확인 |
| payment model → 자기 ui 별칭 | 금지 | 프론트 패턴 |
| payment model → `../ui/Card` | 금지 | 실제 경로 확인 필요 |
| feature index에 UI 두 개·타입 공개 | 금지 | export 직접 확인 필요 |
| shared/libs → shared/hooks 별칭 | 금지 | 프론트 패턴 |
| order → payment public | 금지 | Python 모듈 독립성 계약 |
| usecase → payment repository | 금지 | public 경계 직접 확인 필요 |
| main → payment public의 router | 허용 | Python 계층 계약의 허용 확인 |

설정 형식 검증, 패턴 시험, 실제 lint 실행, 전체 경계 검증은 서로 다른 결과다.
스킬 레포의 `python tools/validate-skills.py`도 frontmatter와 eval JSON 형식만 확인한다.
