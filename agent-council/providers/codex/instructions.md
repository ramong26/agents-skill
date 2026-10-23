# Codex가 총괄일 때

현재 Codex 세션이 총괄이다. 별도의 통합 모델이나 새 Codex 채팅을 만들지 않는다.
설치된 `agent-council` 폴더의 절대 경로를 기준으로 `scripts/council.mjs`를 Node.js로 실행한다.
실행 명령과 JSON 형식은 [실행 규약](../../references/execution.md)을 따른다.

- 현재 Codex의 모델·전역 기본 설정은 변경하지 않는다.
- 별도 Codex CLI 프로세스는 현재 대화 이력을 자동 공유하지 않는다. 다른 서비스와 같은 공통 입력을 전달한다.
- 중첩 CLI 실행이 환경에서 제한되면 제한을 우회하지 않고 해당 참여자를 제외한다.
- Codex의 기존 ChatGPT 로그인을 매번 확인한다. API 키 경로를 허용하지 않으며, 자동 로그인이나 사용량·결제 설정 변경을 하지 않는다.
- 총괄의 허용된 파일·웹·테스트 도구로 핵심 주장을 검증한다. 참여자 초안은 검증된 사실로 취급하지 않는다.
- 실행 도구가 장기 명령을 세션으로 반환하면 해당 도구의 폴링 절차로 완료를 확인하고, 새 취합 실행을 중복 시작하지 않는다.
- 취소 시 실행 중인 취합 프로세스가 정상적으로 정리됐는지 확인하고 미확인 상태는 그대로 보고한다.

## Windows 호스트 실행 권한

Codex의 Windows 실행 도구가 `workspace-write` 등으로 파일·네트워크 접근을 제한하면, council의 `doctor`·`draft`·`review`는 첫 호출부터 `exec_command`의 `sandbox_permissions: "require_escalated"`와 작업 목적을 설명하는 `justification`으로 요청한다. 이 값은 council의 CLI 옵션이 아니라 호스트 실행 도구의 인자다.
제한 셸에서 먼저 실패시킨 뒤 재요청하지 않는다. 제한 셸은 외부 서버 DNS, OS keyring, CLI의 사용자 폴더 접근을 막아 정상 로그인도 실행 오류·시간 초과·인증 접근 실패로 보이게 할 수 있다.

호스트가 Auto-review를 사용하는 세션이면 해당 검토에 요청을 제출한다. `justification`은 [공통 호스트 자동 검토](../../references/execution.md#호스트-자동-검토)의 전송 설명을 따른다. `require_escalated` 자체가 자동 승인 모드를 켜는 설정은 아니며, 호스트의 현재 승인 정책이 판단한다.

- 호스트가 승인한 일반 사용자 환경에서만 실행한다. 관리자 권한이나 전역 샌드박스 해제를 요구하지 않는다.
- 승인이 거절되거나 이 실행 경로가 없으면 해당 명령을 실행하지 않고 호스트 권한 제한을 설명한다. 다른 도구·자격 증명 복사·HOME 변경으로 우회하거나 모델 요청을 재시도하지 않는다.
- 권한 요청은 council 최상위 실행 명령에만 적용한다. 참여 Codex의 read-only, Claude의 safe/restricted, AGY의 sandbox와 도구 제한을 유지한다.
- `collect`·`finalize`는 기록 경로에 접근 가능한 기존 권한을 사용한다. 일반 사용자 셸 등 제한이 없는 환경에서는 호스트의 기존 실행 방식을 따른다.

참여 Codex CLI의 실행 인자·파싱·인증 확인은 `adapter.mjs`의 책임이다.
참여자는 `web_search="live"`로 공개 검색과 원문 열람을 수행할 수 있다. read-only와 명령·앱·MCP·추가 에이전트 차단은 유지한다.
검색 실패 뒤 정상 답변은 보존하되 직접 확인한 URL과 미확인 범위를 구분한다. `research`는 도구 관측이며 총괄 검증의 대체물이 아니다.
검색 설정은 [공식 웹 검색 안내](https://learn.chatgpt.com/docs/web-search)를 기준으로 한다.
공식 기준은 [Codex 비대화형 실행](https://learn.chatgpt.com/docs/non-interactive-mode)과 [모델 문서](https://learn.chatgpt.com/docs/models?surface=cli)다.
최종 취합은 [취합 기준](../../references/synthesis-rules.md)에 따라 현재 세션에서 작성한다.

기존 CLI 로그인으로 바로 요청한다. 사용량·추가 과금 확인 질문으로 중단하지 않는다. 실제 한도·인증 오류가 오면 해당 참여자를 제외하며 자동 재시도·모델 전환은 하지 않는다.
