# 계정·비용 확인

`doctor`, `draft`, `review`를 실행할 때마다 다음을 확인한다. 각 CLI는 계정 화면을 안전하게 조회하지 못하므로, 포함 사용량과 초과 사용 설정을 확인한 제공자만 `--included-only`에 적는다. 이 목록은 해당 호출에만 적용되고 실행 기록에 저장되지 않는다.

## 제공자별 확인

### Codex

ChatGPT의 **설정 → 사용량**에서 Codex 포함 한도가 남았는지 확인한다. 크레딧 잔액이 `0`이고 자동 충전이 꺼져 있어야 한다. 한도 소진 또는 상태 미확인은 호출하지 않는다. 포함 사용량을 먼저 쓰고, 한도 뒤에는 잔액 크레딧을 쓰며 자동 충전도 별도 설정이다. [Codex 사용량](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan), [크레딧·자동 충전](https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-personal-plans)

### Claude Code

Claude의 **설정 → 사용량**에서 현재 세션 및 주간 포함 한도가 남고 `사용 크레딧`이 꺼져 있는지 확인한다. Claude Code는 `claude.ai` OAuth만 허용한다. API 키·토큰·Console 인증 환경 변수가 있으면 사전 제외하므로 Claude Console 자동 충전은 호출 경로에 사용되지 않는다. Claude Console 자동 충전은 API 크레딧 사용에만 적용된다. [Claude 사용 크레딧](https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans), [Claude Code 요금·한도](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan)

### Google Antigravity CLI (`agy`)

Antigravity 설정의 **AI Credit Overages**가 `Never`인지 확인하고, CLI 사용자 설정에 `useG1Credits: false`가 명시되어 있는지 확인한다. 파일 위치는 Windows에서 `%USERPROFILE%\.gemini\antigravity-cli\settings.json`, macOS/Linux에서 `~/.gemini/antigravity-cli/settings.json`이다. 키가 없거나 `true`이면 `agy` 명령도 실행하지 않고 제외한다. 사용자는 `agy`의 `/config` 또는 `/settings`에서 이 옵션을 확인할 수 있다. API 키·ADC 인증도 허용하지 않는다. [Antigravity 요금제·초과 사용](https://www.antigravity.google/docs/plans), [CLI AI 크레딧 설정](https://www.antigravity.google/docs/cli/credits/), [CLI 인증 경로](https://www.antigravity.google/docs/install?tab=cli)

## 매 호출 순서

1. 계정 화면에서 한도가 남았고 추가 사용·자동 충전이 꺼졌는지 확인한다.
2. `doctor`, `draft`, `review`에 확인된 제공자만 `--included-only codex,claude`처럼 적는다. 확인할 수 없는 제공자는 목록에서 뺀다.
3. 실행기는 목록에 없는 제공자의 CLI를 시작하지 않는다. 목록에 있는 각 CLI는 매번 공식 로그인 상태를 확인한 뒤 요청한다.
4. 사용량 소진 응답은 재시도하지 않는다. 그 호출에서 해당 참여자를 제외하고, 한도 초기화 전에는 다시 포함하지 않는다.

`--included-only`는 현재 화면의 사용량 수치를 저장하거나 결제 API를 조회하지 않는 실행별 확인이다. 설정이 바뀌었거나 잔여 한도를 확신할 수 없으면 목록에 넣지 않는다. 로그인 실패 시 Codex는 `codex login`, Claude Code는 `claude`를 실행한 뒤 `/login`, Antigravity CLI는 `agy`를 실행해 공식 브라우저 로그인 안내를 따른다. 로그인은 자동으로 시작하지 않는다.

설치된 작업 디렉터리와 무관하게 인증 확인은 호출자가 명령을 실행한 저장소에서 한다. 모델 요청은 전용 임시 작업 디렉터리에서 실행해 다른 저장소 파일이나 프로젝트 지침을 읽지 않는다.
