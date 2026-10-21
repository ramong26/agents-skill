# Antigravity CLI가 총괄일 때

현재 Antigravity CLI(`agy`) 세션이 총괄이다. 별도 통합 API나 고정된 Codex 총괄을 추가하지 않는다.
설치된 스킬 폴더의 절대 경로를 기준으로 Node.js 실행기를 사용한다.
실행 명령과 JSON 형식은 실행 규약을 따른다.

- 현재 세션의 모델·전역 기본 모델·사용자 인증 설정을 바꾸지 않는다.
- 세 참여 CLI에는 같은 입력과 답변 형식을 전달한다. Gemini에만 아이디어 담당 역할을 부여하지 않는다.
- Google 참여자는 기존 provider 키 gemini를 유지하지만 Antigravity CLI의 agy 실행 파일을 사용한다.
- 참여 모델은 config.json의 명시적 ID를 사용한다. 지정 모델 접근 불가·한도 초과 때 `freeFallbackModel`이 별도로 설정된 경우에만 해당 무료·포함 모델을 한 번 실행한다. 그 외 모델로 자동 대체하지 않는다.
- 기본 Google 인증은 Antigravity CLI가 사용하는 OS 계정 keyring 경로다. API 키 인증과 ADC 인증을 허용하지 않는다.
- Gemini 3.8 Flash는 무료 계정에 baseline quota가 있다. AI Credit Overages가 `Never`인지 확인한 뒤 `--included-only gemini`로 승인한다. `useG1Credits`가 `true`이거나 잘못된 값이면 막고, 키가 없을 때는 공식 문서의 기본값 `false`를 적용한다. 남은 quota를 읽지 못해도 무료 경로가 확인됐으면 한 번 요청할 수 있다.
- 사전 점검은 keyring 토큰을 직접 읽지 않는다. `agy models`로 CLI의 기존 계정 접근과 설정 모델의 목록 포함 여부를 확인하며 모델 응답 생성이나 무료 이용을 보증하지 않는다.
- AGY 작업은 실행별 중립 작업 폴더와 터미널 샌드박스를 사용한다. 외부 접근이나 자동 도구 허용이 가능한 글로벌 설정이면 참여자를 제외한다.
- 글로벌 GEMINI.md, Skills, plugins, MCP 설정이 AGY 응답에 영향을 줄 수 있다. 추가 지침이 동일하다고 주장하지 않는다.
- Gemini의 서비스 기본 추론 설정을 사용하며 다른 서비스의 medium을 억지로 적용하지 않는다.
- 현재 총괄의 허용된 도구로 중요한 주장을 확인하고, 미확인 내용은 최종 답변에 남긴다.

Antigravity CLI 결과는 stream-json의 최종 result 이벤트에서만 추출한다. 도구 사용이 관찰되면 해당 결과를 제외한다.
공식 기준은 Antigravity CLI의 headless mode, authentication, model list, permissions 문서다.
최종 취합은 취합 기준을 따른다.
