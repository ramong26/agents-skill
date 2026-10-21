# 기존 로그인과 실제 오류 처리

## 기본 실행

기본 참여자는 Codex·Claude Code·Antigravity CLI다. 특정 제공자를 빼려면 해당 실행의 `config.json`에서 `enabled: false`로 지정한다.
기존 CLI 로그인으로 질문을 한 번 전달하고 실제 오류가 오면 해당 제공자만 중단한다. 로그인 갱신·사용량 사전 조회·과금 설정 확인·허용 목록 입력을 매번 사용자에게 요청하지 않는다.
`doctor`는 선택적인 읽기 전용 진단이며 모델 질문을 보내지 않는다. `draft`와 `review`는 CLI 로그인 상태를 확인한 뒤 실행한다.

| 결과 | 처리 |
|---|---|
| `auth_failed` | 해당 제공자 중단, 실제 로그아웃일 때만 로그인 명령 표시 |
| `auth_unconfirmed` | 상태 해석 실패로 제외, 로그아웃으로 단정하지 않음 |
| `quota_exhausted` | 사용량 초과로 중단, 재시도·대체 모델 없음 |
| `rate_limited` | 요청 제한으로 중단, 자동 재시도 없음 |
| `credential_store_unavailable` | OS 자격 증명 접근 실패로 제외, 재로그인 요구 없음 |
| `network_error`, `model_unavailable`, `timeout` | 확인된 사유로 해당 제공자만 제외 |

로그인 명령은 Codex `codex login`, Claude `claude` 실행 후 `/login`, Antigravity `agy` 실행 후 공식 로그인 안내다. API 키·ADC·다른 계정으로 대체하지 않는다.
사용량 조회는 사용자가 원할 때만 Codex `/status`, Claude `/usage`, AGY `agy -p /usage`를 사용한다. 정상 실행에는 이 조회가 필요 없다.

## PowerShell에서의 직접 호출

스킬도 별도 터미널 창을 조작하지 않고 같은 방식으로 자식 프로세스를 실행한다. stdin으로 질문을 보내고 stdout의 답변을 수집한다. `Start-Process`로 대화형 창을 세 개 열 필요는 없다.

```powershell
codex exec --ignore-user-config --ignore-rules --ephemeral --skip-git-repo-check --sandbox read-only "2+2는 뭐야?"
claude --print --safe-mode --restricted --tools "" --strict-mcp-config --mcp-config '{"mcpServers":{}}' --permission-mode dontAsk --permission-prompts none "2+2는 뭐야?"
```

Codex는 ChatGPT 계정, Claude는 Claude 계정의 기존 구독 로그인으로 실행한다. 한 서비스의 월 구독이 다른 서비스의 구독까지 제공하지는 않는다. 스킬은 API 키 인증을 거부하며 키를 출력하거나 계정을 전환하지 않는다.

## 과금 범위

월 구독에 포함된 사용량과 별도 구매하는 추가 사용 크레딧은 다르다. 스킬은 구매·충전·업그레이드·결제 설정 변경을 하지 않는다. CLI 계정에 이미 추가 사용이나 크레딧 차감이 켜져 있으면 포함 한도 뒤 정상 응답하면서 크레딧이 사용될 수 있다. 오류가 왔을 때 중단하는 래퍼만으로 추가 과금이 불가능하다고 보장하지 않는다.
`billing: unconfirmed`는 이 한계의 기록이며 별도 사용자 승인 요청이나 모델 실행 차단이 아니다. 과금 차단 확인을 반복 요구하지 않는다. 기존 `--included-only` 옵션은 호환용으로만 남기며 일반 명령에서 사용하지 않는다.

## Antigravity 자격 증명 접근 오류

Windows 제한 셸에서 `agy models`가 `Failed to load stored token from keyring, falling back to file: Access is denied`를 출력했다. 같은 실행에서 로그·crash 파일 쓰기도 거부됐다. 이는 모델 한도 소진이 아니라 프로세스가 OS 자격 증명 저장소와 사용자 경로에 접근하지 못한 환경 문제다.
같은 PC의 허용된 일반 사용자 셸에서는 앞서 모델 목록과 실제 Gemini 답변이 성공했다. 따라서 제한 셸의 일반적인 `not logged into Antigravity` 메시지만으로 계정이 로그아웃됐다고 판단하지 않는다. 사용자가 비활성화한 제공자는 진단·로그인 명령도 실행하지 않는다.
호스트의 권한 승인·네트워크 제한은 스킬의 과금 확인과 별개다. 스킬이 호스트 승인 정책을 끄거나 토큰 복사·HOME 변경으로 격리를 우회하지 않는다.

## 참고한 CLI 래퍼

- [yogirk/agent-council 어댑터](https://github.com/yogirk/agent-council/blob/main/src/adapters.ts): CLI 실행과 실제 인증·요청 제한·실행 오류 분류. 별도 시험 질문을 보내는 preflight는 이 스킬에서 채택하지 않는다.
- [CodeMoot](https://github.com/katarmal-ram/codemoot#how-it-works): Codex CLI의 기존 구독을 이용하는 호출 구조. 구독 사용이 추가 과금 불가능을 뜻하는 것은 아니다.
- [OpenAI Codex Claude Code 플러그인](https://github.com/openai/codex-plugin-cc): 기존 CLI와 로그인 재사용, 미로그인일 때 로그인 안내.

공식 근거: [OpenAI 포함 한도와 크레딧](https://learn.chatgpt.com/docs/pricing#what-are-tokens-and-credits), [Claude 추가 크레딧과 구독](https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans). 로컬 CLI 도움말과 [Codex 설정 참조](https://learn.chatgpt.com/docs/config-file/config-reference)에서 요청별 추가 크레딧 사용 금지 옵션은 확인되지 않았다. 없는 옵션을 만들어 과금 차단을 보장하지 않는다. `--max-budget-usd`나 구매 명령 숨기기를 구독 추가 크레딧 차단과 동일시하지 않는다.
