# Gemini CLI가 총괄일 때

현재 Gemini CLI 세션이 총괄이다. 별도 통합 API나 고정된 Codex 총괄을 추가하지 않는다.
설치된 스킬 폴더의 절대 경로를 기준으로 Node.js 실행기를 사용한다.
실행 명령과 JSON 형식은 [실행 규약](../../references/execution.md)을 따른다.

- 현재 세션의 모델·전역 기본 모델·사용자 인증 설정을 바꾸지 않는다.
- 세 참여 CLI에는 같은 입력과 답변 형식을 전달한다. Gemini에만 아이디어 담당 역할을 부여하지 않는다.
- 참여 Gemini 모델은 `config.json`의 명시적 ID를 사용하며 다른 모델이나 API 키로 대체하지 않는다.
- 모델 공개 여부와 기존 Google 로그인에서의 CLI 접근 가능성은 구분한다.
- 기존 공식 로그인 경로를 확인할 수 없거나 요청 모델에 접근할 수 없으면 해당 참여자를 제외한다.
- 기본 `allow_existing_login`은 기존 로그인으로 실행을 허용하되 과금 미확인을 기록한다. 엄격한 `skip`은 비용 확인 불가 참여자를 요청 전에 제외한다.
- 기존 Google 로그인 설정 확인은 실제 토큰 유효성·모델 접근·무료 이용 보증이 아니다.
- 참여 실행은 Gemini CLI 0.65 이상에서 지원한다. 사용자·시스템 설정의 모델 재정의로 요청 모델이 바뀔 수 있으면 설정을 수정하지 않고 요청 전에 제외한다.
- Gemini의 서비스 기본 추론 설정을 사용하며 다른 서비스의 `medium`을 억지로 적용하지 않는다.
- 현재 총괄의 허용된 도구로 중요한 주장을 확인하고, 미확인 내용은 최종 답변에 남긴다.

참여 Gemini CLI의 실행 인자·설정 차이·출력 추출은 `adapter.mjs`에서 관리한다.
공식 기준은 [비대화형 실행](https://geminicli.com/docs/cli/headless/), [인증](https://geminicli.com/docs/get-started/authentication/), [할당량·요금](https://geminicli.com/docs/resources/quota-and-pricing/)이다.
최종 취합은 [취합 기준](../../references/synthesis-rules.md)을 따른다.
