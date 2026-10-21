# 실행 규약

총괄은 현재 세션이며 실행기는 CLI 병렬 실행과 기록을 담당한다.
필요 환경은 Node.js 22 이상과 사용할 공식 CLI다. Google 참여 CLI는 Antigravity CLI(agy)이며 Gemini CLI 참여자와 다른 어댑터를 사용한다.
스킬이 설치된 절대 경로를 `SKILL`로, 개인 로컬 기록 경로를 `RUNS`로 해석한다.
명령 예시의 `<...>`는 실제 절대 경로로 바꾸고 공백·한글 경로는 따옴표로 감싼다.

## 입력

`draft` 요청은 UTF-8 JSON 파일이다.

```json
{
  "question": "원본 질문",
  "facts": ["확인된 사실"],
  "constraints": ["비용·시간·기존 환경·필수 조건"],
  "unknowns": ["아직 확인하지 못한 사항"],
  "context": "필요한 코드 발췌 또는 자료"
}
```

`question`은 필수이며 스킬 호출 문구를 제외한 사용자 질문 원문을 그대로 담는다. 질문만 받았다면 `{"question":"2 더하기 2는 뭐야?"}`처럼 작성하고 선택 필드는 생략한다.
선택 필드는 사용자가 명시한 사실·제약·미확인 질문과 제공하거나 지정한 원자료만 그대로 담는다. 총괄의 문제풀이·추천·가설·검색 요약으로 입력을 보충하지 않는다.
독립 초안 전에 총괄의 선행 답변을 만들거나 전달하지 않는다. 실행기는 입력을 검증하고 비밀값을 가린 뒤 동일한 공통 프롬프트를 활성 CLI에 병렬 전달하며, 다른 참여자의 답변을 합치지 않는다. 임의로 작성된 필드의 의미적 편향까지 자동 판별하는 것은 아니다.
입력은 셸 명령에 이어 붙이지 않고 파일로 전달한다.
실행기는 각 참여자에게 다음 답변 형식을 공통으로 요청한다.

1. 현재 조건의 권장안 한 가지
2. 핵심 근거
3. 출처 (없으면 `없음`)

세 항목만 요청한다. 중요한 한계·미확인 사실은 핵심 근거에 포함한다. 독립 초안을 모두 수집한 뒤 총괄이 검증·종합하며, 최종 화면에는 종합을 맨 위에 표시하고 각 참여자의 답변 전문을 이어 붙인다.

## 명령

```text
node "<SKILL>/scripts/council.mjs" doctor
node "<SKILL>/scripts/council.mjs" draft --request "<request.json>" --runs-dir "<RUNS>"
node "<SKILL>/scripts/council.mjs" collect --run "<run-directory>"
node "<SKILL>/scripts/council.mjs" review --run "<run-directory>" --request "<review.json>"
node "<SKILL>/scripts/council.mjs" finalize --run "<run-directory>" --verification "<verification.md>" --final "<final.md>"
```

- `doctor`: 활성 제공자의 설치·지원 옵션·기존 로그인을 읽기 전용 점검한다. 사용량·과금 확인을 요구하거나 모델 질문을 보내지 않는다.
- `draft`: 활성 제공자의 기존 로그인을 확인하고 같은 질문으로 독립 초안을 병렬 수집한다. 추가 옵션 없이 실행한다. 실제 인증·한도·모델·실행 오류는 해당 제공자만 제외한다. 비활성화한 제공자는 호출하지 않는다. 반환된 `runDir`를 후속 명령에 사용한다.
- `collect`: 저장된 상태·초안·추가 검토를 읽는다. 새 모델 요청을 보내지 않는다.
- `review`: 초안에 성공한 대상만 추가 검토한다. 한 실행에서 한 번만 허용하며 로그인과 추가 과금 설정을 다시 확인하고 목록을 다시 전달한다.
- `finalize`: 총괄이 이미 작성한 두 파일을 실행 기록에 저장한다. 통합 모델 API를 호출하지 않는다.
- 최종 문서는 초안 3개·추가 검토 3개의 전문과 종합을 담도록 UTF-8 16 MiB까지 허용한다. 검증 문서와 요청 입력은 각각 1 MiB 제한을 유지한다. 큰 초안을 임의로 잘라 원문이라고 표시하지 않는다.
- `doctor`와 `draft`에만 `--config "<config.json>"`을 지정할 수 있다. 후속 단계는 해당 실행에 저장된 설정을 사용한다.
- 참여자 제외는 다른 참여자의 수집을 중단하지 않는다. 잘못된 입력·명령·실행 단계 사용은 명령 오류다.
- 중첩 실행 표식 `AGENT_COUNCIL_ACTIVE=1`에서는 실행기가 새 취합 실행을 거부한다.

`review.json`은 다음 형식이다.

```json
{
  "issue": "B가 필수 조건 X를 충족하는지 제공된 근거로 재검토하고, 미확인 사실을 구분하라.",
  "providers": ["codex", "claude"]
}
```

전달할 반론·근거는 `issue`에 필요한 범위만 명시한다.
추가 검토는 새로운 의견이며 사실 검증의 대체물이 아니다.
초안에서 제외된 대상이나 같은 실행의 두 번째 검토 요청은 허용하지 않는다.

## 실행 기록

```text
<RUNS>/<run-id>/
├── request.json
├── status.json
├── drafts/<provider>.json
├── reviews/<provider>.json  # 추가 검토가 있을 때만
├── verification.md         # finalize 후
└── final.md                # finalize 후
```

실행기는 설정과 중립 작업 폴더 등 실행에 필요한 내부 파일을 함께 관리할 수 있다.
설치 위치에 질문·초안·임시 파일을 쌓지 않는다.
각 결과는 서비스, 단계, 성공/제외, 실패 코드, 조치 안내(`actionHint`), 필요한 경우 공식 로그인 명령(`loginHint`), 최종 답변, 요청 모델, 실제 확인 모델, 대체 모델과 전환 사유, CLI 버전, 소요 시간을 구분한다.
`auth`와 `billing`은 별도 항목이다. `auth: existing_login`은 해당 호출에서 기존 로그인을 확인했다는 뜻이고 `billing: included_only`는 사용자가 추가 과금 경로를 껐다고 확인한 뜻이다. `billing: unconfirmed`는 과금 미확인 기록이며 실행을 막지 않는다. 잔여 사용량은 요청 전 보장하지 않으며, 한도 오류는 `quota_exhausted`로 반환한다.
Google 참여자는 `useG1Credits`가 `true`이거나 값이 잘못됐으면 CLI 검사에서 제외한다. 키가 없으면 Antigravity CLI 문서에 기재된 기본값 `false`를 적용한다. `doctor`는 `agy models`가 성공하고 설정 모델이 목록에 있는지도 확인한다. CLI는 OS keyring의 계정 토큰을 사용하며 스킬은 토큰을 직접 읽지 않는다. 실제 headless 요청에서 인증 오류가 나면 해당 참여자를 제외한다.
Antigravity CLI는 전역 GEMINI.md, Skills, plugins, MCP 설정의 영향을 받을 수 있다. 실행별 전용 작업 폴더만 workspace로 지정하고 --sandbox를 사용한다. 기본 workspace 파일 접근은 해당 임시 폴더에 제한되며 글로벌 permissions.allow가 비어 있지 않거나 allowNonWorkspaceAccess가 켜져 있으면 사전 제외한다. 결과 stream에서 도구 호출이 관찰되면 답변을 취합하지 않는다.
확인 모델이 없으면 `null` 또는 확인 불가로 남기며 모델 본문의 자기소개로 채우지 않는다.
Antigravity CLI의 공개 stream-json 예시는 실제 모델 식별자를 결과에 포함하지 않는다. 별도 메타데이터가 없으면 actualModel을 null로 기록하고 요청 모델의 본문 자기소개로 채우지 않는다.
진행 이벤트와 원시 오류 로그를 정상 답변이나 검증 근거로 사용하지 않는다.

상태의 완료 단계는 `draft_complete`, `review_complete`, `finalized`이며 취소는 `cancelled`다.
같은 실행의 검토·최종 저장은 공유 잠금으로 직렬 접근한다. 동시 변경 요청은 `run_busy`로 거부한다. 강제 종료로 `.mutation-lock`이 남으면 `collect`로 결과를 보존하고 새 실행을 시작한다.
추가 검토 실패는 기존 초안의 성공 상태를 변경하지 않는다.
전체 성공 수는 서로 다른 서비스의 정상 독립 초안 수로 계산한다.

## 인증·모델·비용

기본 참여자는 Codex·Claude·Antigravity CLI다. 사용자가 `enabled: false`로 제외한 제공자는 호출하지 않는다.
기존 CLI 로그인이 확인되면 지정 모델에 한 번 요청한다. 실제 한도 오류는 `quota_exhausted`, 인증 실패는 `auth_failed`, 모델 접근 오류는 `model_unavailable`로 기록하고 해당 제공자를 중단한다.
`policy.on_unconfirmed_billing`은 `use_existing_login`, `model_fallback`은 `false`다. 사용량·과금 설정을 사전 조회하거나 사용자에게 확인받는 절차는 없다. 기존 `--included-only`는 호환용 상태 표식이며 실행 허용 조건이 아니다.
잔여 사용량은 보장하지 않으며 기존 CLI 계정의 크레딧 사용을 실행기가 차단한다고 보장하지 않는다. `billing: unconfirmed`를 보고도 확인 질문으로 멈추지 않는다. 자세한 한계는 [계정·오류 안내](account-checks.md)를 따른다.
Codex·Claude 인증 확인은 호출 저장소 CWD에서, 모델 요청은 실행별 임시 작업 폴더에서 한다. 읽기 전용·도구 비활성·MCP 비활성 제한을 유지한다.
실제 로그아웃에만 공식 로그인 명령을 표시한다. 상태 해석 실패·keyring 접근 실패에는 재로그인을 요청하지 않는다. 허용된 일반 사용자 셸에서의 진단과 호스트 승인 정책을 구분하며 인증 격리를 우회하지 않는다.
API 키·ADC·추가 크레딧 구매·충전·계정 전환·임의 모델 전환은 하지 않는다. 자동 재시도는 0회다. 상세 원인이 불명확하면 임의로 로그인·한도 오류로 바꾸지 않는다.
AGY는 stream-json 양방향과 stdin user 이벤트를 사용한다. 개인 크레딧 설정 `useG1Credits`가 명시적으로 켜져 있거나 잘못됐으면 `credit_fallback_enabled`로 제외하며 값을 자동 변경하지 않는다.

## 취소·보관

사용자가 취소하면 실행 중 프로세스와 후손을 정리하고 이미 받은 정상 결과는 보존한다.
시간 초과는 해당 참여자 제외이며 총괄의 전체 답변 시간 목표와는 다르다.
독립 초안은 참여자별 150초, 추가 검토는 요청별 90초가 기본값이다.
전체 약 5분은 유연한 목표이며 코드 조사·측정이 필요한 작업의 보장 시간이 아니다.

원본 질문과 자료가 로컬 기록에 남는다. 비공개 코드·개인정보는 필요한 범위만 제공한다.
기록 디렉터리는 공개 저장소·공유 폴더 밖의 개인 위치를 선택하고 버전 관리에 포함하지 않는다.
사용 후 보관할 필요가 없는 실행 디렉터리는 사용자의 보관 정책에 따라 삭제한다.
실행기는 계정 설정이나 기존 CLI 기록 전체를 삭제하지 않는다.
