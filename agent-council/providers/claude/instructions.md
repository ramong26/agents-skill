# Claude Code가 총괄일 때

현재 Claude Code 세션이 총괄이다. Codex를 항상 총괄로 고정하지 않는다.
설치된 스킬 폴더의 절대 경로를 기준으로 Node.js 실행기를 사용한다.
Claude Code가 제공하는 스킬 디렉터리 정보를 사용할 수 있으면 그 경로를 기준으로 해석한다.
실행 명령과 JSON 형식은 [실행 규약](../../references/execution.md)을 따른다.

- 현재 세션 모델·전역 설정·계정 결제 설정을 변경하지 않는다.
- 세 참여 CLI에는 동일 입력만 전달하고, 독립 초안 단계에 서로의 답변을 보여주지 않는다.
- 중첩 Claude 실행 제한이 있으면 우회하지 않고 해당 참여자만 제외한다.
- Claude Code는 Free 플랜에 포함되지 않으므로 무료 Claude 웹 모델을 이 CLI의 대체 모델로 사용하지 않는다. Claude Code를 포함하는 구독에서 추가 사용이 꺼졌는지 확인한 뒤 `--included-only claude`로 승인한다. 포함 사용량을 읽지 못해도 요청은 한 번 시도할 수 있고, 한도 오류가 나면 설정된 무료·포함 대체 모델이 없는 한 중단한다.
- 매 호출에 `claude.ai` 기존 로그인을 확인한다. API·Console 인증과 사용 크레딧을 사용하지 않으며, 자동 로그인이나 결제 설정 변경을 하지 않는다.
- 정상 Claude 초안 뒤 추가 검토가 실패해도 기존 초안을 유지한다.
- 총괄 세션의 허용된 도구로 중요한 사실을 검증하고 최종 답변을 직접 작성한다.

참여 Claude CLI의 비대화형 실행·출력 해석·모델 설정은 `adapter.mjs`에서 관리한다.
공식 기준은 [비대화형 실행](https://code.claude.com/docs/en/headless), [모델 설정](https://code.claude.com/docs/en/model-config), [사용 크레딧](https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans)이다.
최종 취합은 [취합 기준](../../references/synthesis-rules.md)을 따른다.
