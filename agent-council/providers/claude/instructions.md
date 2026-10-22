# Claude Code가 총괄일 때

현재 Claude Code 세션이 총괄이다. Codex를 항상 총괄로 고정하지 않는다.
설치된 스킬 폴더의 절대 경로를 기준으로 Node.js 실행기를 사용한다.
Claude Code가 제공하는 스킬 디렉터리 정보를 사용할 수 있으면 그 경로를 기준으로 해석한다.
실행 명령과 JSON 형식은 [실행 규약](../../references/execution.md)을 따른다.

- 현재 세션 모델·전역 설정·계정 결제 설정을 변경하지 않는다.
- 세 참여 CLI에는 동일 입력만 전달하고, 독립 초안 단계에 서로의 답변을 보여주지 않는다.
- 중첩 Claude 실행 제한이 있으면 우회하지 않고 해당 참여자만 제외한다.
- 로그인·구독이 유효해도 추가 사용 크레딧 가능성은 별개다. 기본 `allow_existing_login`이면 기존 공식 로그인으로 실행하되 비용 미확인을 기록하고 활성화된 사용 크레딧이 사용될 수 있음을 설명한다.
- 엄격한 `skip`에서는 추가 과금 가능성 확인 불가를 요청 전 제외로 처리한다. 어느 정책에서도 로그인이나 결제 설정을 변경하지 않는다.
- 정상 Claude 초안 뒤 추가 검토가 실패해도 기존 초안을 유지한다.
- 총괄 세션의 허용된 도구로 중요한 사실을 검증하고 최종 답변을 직접 작성한다.

참여 Claude CLI의 비대화형 실행·출력 해석·모델 설정은 `adapter.mjs`에서 관리한다.
참여자는 `WebSearch`와 `WebFetch`만 사용할 수 있다. `--tools`·`--allowedTools`의 제한과 safe/restricted·빈 MCP 설정을 함께 유지한다.
stream-json에서 도구 호출·결과와 최종 응답을 분리한다. 검색·열람 실패 뒤 정상 답변은 보존하고 미확인 출처는 명시한다.
응답 모델은 assistant 메시지·초기화 메타데이터로 확인한다. `modelUsage`에는 웹 도구 내부 보조 모델이 포함될 수 있으므로 이를 응답 모델 대체로 단정하지 않는다. 응답 메타데이터 없이 여러 사용 모델만 있으면 실제 응답 모델은 확인 불가다.
공식 기준은 [비대화형 실행](https://code.claude.com/docs/en/headless), [모델 설정](https://code.claude.com/docs/en/model-config), [사용 크레딧](https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans)이다.
최종 취합은 [취합 기준](../../references/synthesis-rules.md)을 따른다.
