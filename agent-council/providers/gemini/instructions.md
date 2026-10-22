# Antigravity CLI가 총괄일 때

현재 Antigravity CLI(`agy`) 세션이 총괄이다. 별도 통합 API나 고정된 Codex 총괄을 추가하지 않는다.
설치된 스킬 폴더의 절대 경로를 기준으로 Node.js 실행기를 사용한다.
실행 명령과 JSON 형식은 실행 규약을 따른다.

- 현재 세션의 모델·전역 기본 모델·사용자 인증 설정을 바꾸지 않는다.
- 세 참여 CLI에는 같은 입력과 답변 형식을 전달한다. Gemini에만 아이디어 담당 역할을 부여하지 않는다.
- Google 참여자는 기존 provider 키 gemini를 유지하지만 Antigravity CLI의 agy 실행 파일을 사용한다.
- Google 참여자도 기존 로그인으로 지정 모델을 한 번 실행하며 실패 시 자동 대체하지 않는다. 비활성화한 실행에서는 호출하지 않는다.
- 기본 Google 인증은 Antigravity CLI가 사용하는 OS 계정 keyring 경로다. API 키 인증과 ADC 인증을 허용하지 않는다.
- 사전 점검은 keyring 토큰을 직접 읽지 않는다. `agy models`로 CLI의 기존 계정 접근과 설정 모델의 목록 포함 여부를 확인하며 모델 응답 생성이나 무료 이용을 보증하지 않는다.
- keyring 접근 거부와 sign-in 오류가 함께 나오면 로그인 미확인으로 처리한다. 허용된 일반 사용자 셸에서 `doctor`를 확인하며 재로그인·토큰 복사·HOME 변경을 해결책으로 실행하지 않는다.
- AGY 작업은 실행별 중립 작업 폴더와 터미널 샌드박스를 사용한다. 외부 접근이나 자동 도구 허용이 가능한 글로벌 설정이면 참여자를 제외한다.
- 글로벌 GEMINI.md, Skills, plugins, MCP 설정이 AGY 응답에 영향을 줄 수 있다. 추가 지침이 동일하다고 주장하지 않는다.
- Gemini의 서비스 기본 추론 설정을 사용하며 다른 서비스의 medium을 억지로 적용하지 않는다.
- 현재 총괄의 허용된 도구로 중요한 주장을 확인하고, 미확인 내용은 최종 답변에 남긴다.

Antigravity CLI 답변은 stream-json의 최종 result 이벤트에서만 추출한다. 도구 이벤트는 `search_web`·`read_url_content`만 수집하고 다른 도구·명령·파일·MCP·하위 에이전트는 제외한다.
`step_update`의 `tool_name`·`tool_info.name`을 대조하고 `DONE`·오류 없음인 호출만 완료로 센다. 검색 실패 뒤 정상 답변은 보존하며 완료 횟수를 출처 검증으로 표현하지 않는다.
기존 전역 권한 검사와 sandbox를 유지하며 도구 자동 승인이나 글로벌 권한을 추가하지 않는다. headless 권한 거절은 exit 0으로 끝날 수도 있으므로 조사 불가·미확인 범위를 답변에 명시한다.
도구 식별자는 [공식 도구 안내](https://antigravity.google/docs/hooks#search-and-research), 이벤트는 [headless 문서](https://antigravity.google/docs/cli/headless)를 기준으로 한다.
공식 기준은 Antigravity CLI의 headless mode, authentication, model list, permissions 문서다.
최종 취합은 취합 기준을 따른다.
