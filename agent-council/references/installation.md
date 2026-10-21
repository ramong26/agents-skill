# 공통 원본과 여러 CLI 등록

이 저장소의 `agent-council/` 전체가 공통 원본이다.
실행기·어댑터·취합 기준은 한 곳에서 유지하고, 각 CLI는 자신의 검색 위치에서 이 폴더를 발견하게 한다.
참여 CLI가 독립 답변만 만들 때는 이 스킬의 설치가 필요하지 않다.
총괄로 이 스킬을 호출할 CLI에만 등록하면 된다.

## Google 참여자 CLI

Google 모델 참여자는 Antigravity CLI의 agy 실행 파일을 사용한다. 저장된 설정·기록과 호환되도록 내부 provider ID는 gemini로 유지한다.
참여 CLI를 사용하려면 Antigravity CLI를 설치하고 공식 Google 계정으로 로그인해야 한다. headless 실행은 OS keyring의 저장된 credentials를 사용한다.
Windows의 기본 실행 파일 위치는 `%LOCALAPPDATA%\agy\bin\agy.exe`다. PATH에 없더라도 이 위치를 자동으로 확인한다.
PowerShell에서 실행 파일 경로를 확인한다. 계정 사용량과 초과 사용 설정을 먼저 확인하고, 안전 조건이 확인된 뒤에만 스킬의 `doctor --included-only gemini`로 모델 목록과 로그인을 점검한다.

```powershell
$agy = Join-Path $env:LOCALAPPDATA 'agy\bin\agy.exe'
Test-Path -LiteralPath $agy
```

로그인이 필요하면 `& $agy`를 실행하고 공식 브라우저 안내를 따른다. `AI Credit Overages`가 `Never`가 아니거나 `useG1Credits`가 `true`·잘못된 값이면 실행을 허용하지 않는다. `useG1Credits`가 없으면 공식 문서에 정의된 기본값 `false`를 적용한다.
이 스킬은 로그인·브라우저 인증을 시작하지 않으며 Gemini API key나 Application Default Credentials로 전환하지 않는다.
기본 모델 ID는 gemini-3.8-flash-medium이다. 모델 문서에서 Free, Plus, Pro, Ultra, Enterprise에 제공되는 것으로 표시된 모델을 기본값으로 선택한다.

## 검색 위치

다음은 사용자 범위의 로컬 등록 위치다. `~`는 사용자 홈이다.

| 총괄 CLI | 위치 | 근거 |
| --- | --- | --- |
| Codex | `~/.agents/skills/agent-council/` | [공식 스킬 문서](https://learn.chatgpt.com/docs/build-skills) |
| Claude Code | `~/.claude/skills/agent-council/` | [공식 스킬 문서](https://code.claude.com/docs/en/skills) |
| Antigravity CLI (`agy`) | `~/.gemini/antigravity-cli/skills/agent-council/` 또는 workspace `.agents/skills/agent-council/` | [공식 스킬 문서](https://antigravity.google/docs/skills) |

Codex·Claude Code는 로컬 스킬 폴더 링크를 지원한다.
Antigravity CLI는 workspace `.agents/skills`와 사용자 전역 스킬 경로를 지원한다.
운영체제의 링크 권한과 설치된 CLI 버전에서 실제 발견되는지 확인한 뒤 사용한다.

## 등록·갱신 원칙

1. 가능한 환경에서는 공통 원본을 가리키는 폴더 링크로 등록한다.
2. 링크가 불가능하면 `SKILL.md`만이 아니라 `agent-council/` 전체를 복사한다.
3. 복사 방식이면 원본 변경 때 등록한 모든 복사본을 함께 갱신하고 실제 파일을 비교한다.
4. 기존 동명 스킬이 있으면 내용을 확인하고 사용자 변경을 덮어쓰지 않는다.
5. 스크립트 경로는 등록된 스킬 위치를 기준으로 해석하며 현재 작업 디렉터리를 기준으로 추측하지 않는다.
6. 등록 후 해당 CLI의 스킬 목록에서 발견되는지 확인한다. 발견 확인과 모델 실행 검증은 별개다.

이 안내는 계정 로그인·설정 변경·결제 설정·CLI 자동 설치를 수행하지 않는다.
현재 세션의 모델이나 사용자의 전역 기본 모델을 바꾸지 않는다.
독립 답변을 만드는 참여 프로세스는 스킬을 다시 호출하지 않으며 실행기의 중첩 실행 차단을 유지한다.

## 실행 위치

Node.js 22 이상으로 설치된 스킬 폴더의 `scripts/council.mjs`를 실행한다.
실행 기록은 [실행 규약](execution.md)에 따라 설치 폴더 밖의 개인 작업 위치에 둔다.
설치된 파일을 수정해 실행별 질문·초안·설정 상태를 저장하지 않는다.

실행할 때마다 [계정·비용 확인](account-checks.md)을 먼저 수행한다. 모든 활성 제공자의 로그인은 읽기 전용으로 검사한다. 한도·초과 설정을 확인한 제공자만 `doctor`·`draft`·`review`의 `--included-only`에 명시해 모델 요청을 허용한다. 목록에서 빠진 제공자는 로그인 검사만 하고 모델 요청은 보내지 않는다.
이 스킬은 확인된 제공자의 기존 로그인 상태를 매 호출 검사한다. 인증 실패 시 Codex는 `codex login`, Claude Code는 `claude`를 실행한 뒤 `/login`, Antigravity CLI는 `agy`를 실행해 공식 로그인 안내를 따른다. 자동 인증은 시작하지 않는다.
다른 저장소에서 실행해도 인증 사전 점검은 호출 저장소 CWD에서 진행하고, 실제 모델 요청은 전용 임시 폴더에서 실행한다. 스킬 발견·사전 점검 통과는 실제 모델 접근·잔여 한도·추가 과금 없음의 보증이 아니다.
