# Codex가 총괄일 때

현재 Codex 세션이 총괄이다. 별도의 통합 모델이나 새 Codex 채팅을 만들지 않는다.
설치된 `agent-council` 폴더의 절대 경로를 기준으로 `scripts/council.mjs`를 Node.js로 실행한다.
실행 명령과 JSON 형식은 [실행 규약](../../references/execution.md)을 따른다.

- 현재 Codex의 모델·전역 기본 설정은 변경하지 않는다.
- 별도 Codex CLI 프로세스는 현재 대화 이력을 자동 공유하지 않는다. 다른 서비스와 같은 공통 입력을 전달한다.
- 중첩 CLI 실행이 환경에서 제한되면 제한을 우회하지 않고 해당 참여자를 제외한다.
- 기본 `allow_existing_login`에서는 기존 공식 로그인이 확인되면 요청하고 과금 미확인을 기록한다. 엄격한 `skip`은 비용 미확인 참여자를 제외한다.
- 총괄의 허용된 파일·웹·테스트 도구로 핵심 주장을 검증한다. 참여자 초안은 검증된 사실로 취급하지 않는다.
- 실행 도구가 장기 명령을 세션으로 반환하면 해당 도구의 폴링 절차로 완료를 확인하고, 새 취합 실행을 중복 시작하지 않는다.
- 취소 시 실행 중인 취합 프로세스가 정상적으로 정리됐는지 확인하고 미확인 상태는 그대로 보고한다.

참여 Codex CLI의 실행 인자·파싱·인증 확인은 `adapter.mjs`의 책임이다.
공식 기준은 [Codex 비대화형 실행](https://learn.chatgpt.com/docs/non-interactive-mode)과 [모델 문서](https://learn.chatgpt.com/docs/models?surface=cli)다.
CLI 설치·로그인 유효성·지정 모델 접근·비용 정책 확인은 서로 다른 항목이다.
사전 점검 통과나 기존 로그인은 무료·추가 과금 없음의 보증이 아니다.
최종 취합은 [취합 기준](../../references/synthesis-rules.md)에 따라 현재 세션에서 작성한다.
