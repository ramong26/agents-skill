# 경계 강제 설정

구조 규칙은 문서만으로 지켜지지 않는다. 아래 중 프로젝트 스택에 맞는 것 하나를 도입해 CI에서 실패하게 만든다. 경로와 레이어 이름은 예시이므로 대상 레포에 맞게 바꾼다.

## JS / TS — ESLint no-restricted-imports

추가 의존성 없이 쓸 수 있는 최소 수단. 도메인 내부 직접 import와 역방향 import를 막는다.

```js
// eslint.config.js
export default [
  {
    files: ["src/domains/*/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: ["**/domains/*/handler/**", "**/domains/*/service/**",
                    "**/domains/*/repository/**", "**/domains/*/model/**"],
            message: "다른 도메인은 public을 통해서만 사용한다.",
          },
          {
            group: ["**/application/**", "**/checkout/**"],
            message: "도메인은 조율 계층을 import하지 않는다.",
          },
        ],
      }],
    },
  },
  {
    files: ["src/shared/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{ group: ["**/domains/**"], message: "shared는 도메인 코드를 import하지 않는다." }],
      }],
    },
  },
];
```

같은 도메인 안에서는 상대 경로 import가 허용되므로, 위 패턴은 도메인 간 참조만 걸린다. 계층 역방향까지 정확히 막으려면 아래 도구를 쓴다.

## JS / TS — eslint-plugin-boundaries

레이어를 선언하고 허용된 방향만 열어준다.

```js
settings: {
  "boundaries/elements": [
    { type: "handler",    pattern: "src/domains/*/handler/*" },
    { type: "service",    pattern: "src/domains/*/service/*" },
    { type: "repository", pattern: "src/domains/*/repository/*" },
    { type: "model",      pattern: "src/domains/*/model/*" },
    { type: "public",     pattern: "src/domains/*/public/*" },
    { type: "shared",     pattern: "src/shared/*" },
  ],
},
rules: {
  "boundaries/element-types": ["error", {
    default: "disallow",
    rules: [
      { from: "handler",    allow: ["service", "model", "public", "shared"] },
      { from: "service",    allow: ["repository", "model", "public", "shared"] },
      { from: "repository", allow: ["model", "shared"] },
      { from: "model",      allow: ["shared"] },
      { from: "shared",     allow: ["shared"] },
    ],
  }],
},
```

`default: "disallow"`라서 명시하지 않은 방향은 전부 막힌다. 위 표가 곧 "import는 위에서 아래로만" 규칙이다.

## JS / TS — dependency-cruiser (순환 참조 + 경계)

```js
// .dependency-cruiser.js
module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    {
      name: "domain-internal-only",
      severity: "error",
      from: { path: "^src/domains/([^/]+)/" },
      to: { path: "^src/domains/(?!$1)([^/]+)/(?!public)" },
    },
    {
      name: "no-upward-import",
      severity: "error",
      from: { path: "^src/domains/[^/]+/repository/" },
      to: { path: "^src/domains/[^/]+/(service|handler)/" },
    },
  ],
};
```

CI: `npx depcruise src --config .dependency-cruiser.js`

## Python — import-linter

```ini
# setup.cfg 또는 .importlinter
[importlinter]
root_package = app

[importlinter:contract:layers]
name = 계층은 위에서 아래로만
type = layers
layers =
    handler
    service
    repository
    model
containers =
    app.domains.payment
    app.domains.order

[importlinter:contract:domains]
name = 도메인은 서로 독립
type = independence
modules =
    app.domains.payment
    app.domains.order
```

CI: `lint-imports`

## Java / Kotlin — ArchUnit

```java
@ArchTest
static final ArchRule layers = layeredArchitecture().consideringAllDependencies()
    .layer("Handler").definedBy("..handler..")
    .layer("Service").definedBy("..service..")
    .layer("Repository").definedBy("..repository..")
    .whereLayer("Handler").mayNotBeAccessedByAnyLayer()
    .whereLayer("Service").mayOnlyBeAccessedByLayers("Handler")
    .whereLayer("Repository").mayOnlyBeAccessedByLayers("Service");

@ArchTest
static final ArchRule domainBoundary = noClasses()
    .that().resideInAPackage("..domains.order..")
    .should().dependOnClassesThat()
    .resideInAPackage("..domains.payment..")
    .andShould().notDependOnClassesThat().resideInAPackage("..domains.payment.public..");
```

## 도입 순서

1. 먼저 순환 참조 금지부터 켠다. 위반이 가장 적고 효과가 크다.
2. 다음으로 도메인 간 직접 참조 금지를 켠다. 위반이 나오면 해당 도메인의 `public`에 필요한 것만 공개한다.
3. 마지막으로 계층 역방향 금지를 켠다.
4. 기존 위반이 많으면 한 번에 고치지 말고 `warn`으로 시작해 신규 코드부터 `error`로 올린다.
