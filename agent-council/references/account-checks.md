# 사용량·인증 확인

각 `doctor`, `draft`, `review` 실행은 해당 호출자의 저장소에서 CLI 로그인을 다시 확인한다. 이 확인은 모델 요청이 아니다. 로그인하지 않은 제공자는 로그인 명령을 안내하고 건너뛴다.

사용량을 자동 조회하는 공통 API는 없다. 필요하면 제공자 CLI의 읽기 전용 사용량 화면을 볼 수 있다. 사용량 잔여량을 사전에 확인하지 않아도 실행할 수 있지만, 실제 모델 요청은 `--included-only`에 적힌 제공자만 허용한다. 이 목록은 해당 제공자의 추가 과금·크레딧 경로가 꺼져 있음을 확인했다는 뜻이다. 사용량이 소진되면 CLI 오류를 그대로 분류하고 재시도하지 않는다.

## CLI 사용량 명령

| 제공자 | 로그인 확인 | 사용량 확인 |
|---|---|---|
| Codex | `codex login status` | `codex` 실행 후 `/status` |
| Claude Code | `claude auth status` | `claude` 실행 후 `/usage`; `/usage-credits`에서 추가 사용이 꺼졌는지 확인 |
| Antigravity | `agy models` | `agy -p /usage`; 크레딧은 `agy -p /credits`, 추가 사용 설정은 `agy -p /config` |

Codex와 Claude의 사용량 명령은 대화형 CLI 안에서 실행한다. Antigravity의 `-p /usage`는 CLI가 처리하는 읽기 전용 사용량 명령이다. 로그인 안내가 나오면 스킬이 브라우저 로그인을 대신하거나 인증 코드를 수집하지 않는다.

Windows의 제한된 셸은 OS keyring을 읽지 못해 기존 로그인에도 일반적인 sign-in 오류를 출력할 수 있다. 로그에 keyring 접근 거부가 함께 있으면 `credential_store_unavailable`이며 로그인 상태는 미확인이다. 같은 저장소에서 일반 사용자 권한의 허용된 셸로 읽기 전용 `doctor`를 실행해 확인한다. 일반 셸에서 성공하면 기존 로그인을 유지한다. HOME·인증 환경변수 변경이나 토큰 복사로 우회하지 않는다. 모델 요청은 자동으로 재실행하지 않는다.

## 제공자별 과금 차단

### Codex

Free·Go 계정의 Codex CLI 모델은 `gpt-5.6-terra`를 사용한다. 다른 기본 모델에 접근할 수 없거나 그 모델의 사용 한도에 도달하면 설정된 이 무료·포함 모델을 한 번 시도할 수 있다. 그 요청도 한도에 도달하면 중단한다. `/status`는 남은 사용량과 초기화 시점을 보여준다. 크레딧 잔액이 `0`이고 자동 충전이 꺼져 있는지 ChatGPT **설정 → 사용량**에서 확인한다. [Codex 플랜·모델·사용량](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan), [모델별 플랜 접근](https://help.openai.com/en/articles/20001354-gpt-6-and-other-models-in-chatgpt), [크레딧과 자동 충전](https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-personal-plans)

### Claude Code

Claude Code는 Free 플랜에 포함되지 않는다. Claude Free 계정은 이 CLI를 무료 모델로 대체할 수 없으므로 이 제공자를 건너뛴다. Pro/Max 등 Claude Code가 포함된 플랜에서는 `/usage`로 포함 한도를 확인하고, `/usage-credits`에서 추가 사용이 꺼졌는지 확인한다. 사용 한도 오류가 나면 다른 모델·API·추가 크레딧으로 우회하지 않는다. [Claude 요금제](https://claude.com/pricing), [Claude Code 사용량](https://support.claude.com/en/articles/14552983-models-usage-and-limits-in-claude-code)

### Antigravity CLI (`agy`)

무료 계정에도 Gemini 3.8 Flash baseline quota가 제공된다. 기본 모델 `gemini-3.8-flash-medium`은 무료 요금제에서도 사용할 수 있으므로 기본 설정에는 별도 fallback을 두지 않는다. 다른 기본 모델을 선택한 경우 무료 fallback이 필요하면 `freeFallbackModel`을 `gemini-3.8-flash-medium`으로 지정한다. `agy -p /usage`에서 요청 모델별 baseline quota를 확인한다. CLI의 추가 크레딧 사용은 `agy -p /config`에서 `useG1Credits=false`인지 확인한다. CLI 문서상 해당 키의 기본값도 `false`다. 키가 없으면 문서화된 기본값을 적용하지만, `true`나 알 수 없는 값이면 차단한다. 앱의 **AI Credit Overages**를 확인하는 경우에도 `Never`를 사용하며, 앱 설정을 CLI 설정 확인의 대체로 삼지 않는다. `/credits`의 `no credits info found`는 잔액 0이나 과금 차단의 증거가 아니다. [Antigravity 요금제·초과 사용](https://www.antigravity.google/docs/plans), [요금제별 모델 접근](https://www.antigravity.google/docs/models/), [CLI 설정과 크레딧](https://www.antigravity.google/docs/cli/credits/), [CLI `/usage`](https://www.antigravity.google/docs/cli/commands/usage)

## 실행 판단

1. 각 CLI가 기존 계정으로 로그인됐는지 먼저 검사한다. 계정 확인은 저장소와 무관하게 사용자 계정을 조회한다.
2. 사용량을 확인할 수 있으면 위의 CLI 명령으로 확인한다. 사용량 화면을 열 수 없는 경우에도 추가 과금 경로를 끈 것을 확인했다면 요청은 시도할 수 있다.
3. 추가 사용·크레딧·자동 충전이 꺼진 제공자만 `--included-only codex,claude`처럼 지정한다. 확인되지 않은 제공자는 빼고, 실행기는 그 제공자의 모델 CLI를 호출하지 않는다.
4. `--included-only` 확인이 있을 때만 지정 모델 오류·한도 소진 후 명시된 무료·포함 `freeFallbackModel`을 한 번 시도한다. 대체도 실패하거나 소진되면 `quota_exhausted` 등 실제 사유를 기록하고 중단한다. 임의 모델·다른 계정·결제 경로로 전환하지 않는다.

사용량 확인값과 계정 정보를 실행 기록에 저장하지 않는다. 로그인 실패 시 Codex는 `codex login`, Claude Code는 `claude` 후 `/login`, Antigravity CLI는 `agy`를 실행해 공식 로그인 절차를 마친다.
