---
name: frontend-ui-testing
description: This skill should be used when the user asks to test or debug a rendered frontend, check a localhost app, verify a UI interaction, inspect responsive layout, find browser console errors, or perform visual QA. It is for rendered behavior, not unit-only code review.
metadata:
  source: "Adapted from the installed frontend-testing-debugging skill"
---

# Frontend UI Testing

실제로 렌더링된 프론트엔드 화면과 사용자 흐름을 확인한다. 빌드 성공만으로 화면이 정상이라고 판단하지 않는다.

## 진행

1. 저장소의 실행 스크립트와 현재 앱 주소를 확인한다.
2. 테스트할 흐름을 한 문장으로 정의한다.
   `진입 화면 → 사용자 행동 → 기대하는 화면 상태`
3. 현재 컨텍스트에 Browser 스킬이 있으면 그 절차를 먼저 따른다.
4. Browser를 사용할 수 없거나 사용자가 fallback을 허용한 경우에만 프로젝트의 Playwright나 기존 E2E 도구를 사용한다.
5. 코드 변경이 포함되면 가장 작은 변경 후 같은 흐름을 다시 실행한다.

## 필수 확인

- 의도한 URL과 페이지 제목인지 확인한다.
- 빈 화면이나 프레임워크 오류 오버레이가 없는지 확인한다.
- 콘솔 오류·경고를 확인하고 관련 없는 로그와 앱 오류를 구분한다.
- 주요 버튼·입력·필터 등 실제 사용자 상호작용을 한 번 이상 실행한다.
- 상호작용 뒤 URL, 포커스, 텍스트, 모달, 토스트 등 상태가 바뀌었는지 확인한다.
- 가능하면 데스크톱과 모바일 화면에서 잘림, 겹침, 가로 스크롤, 로딩·빈 상태를 확인한다.
- 시각적 주장을 할 때는 스크린샷 또는 DOM 상태를 근거로 남긴다.

## 제한

- 새 브라우저 의존성은 프로젝트에 이미 설정된 도구가 없고 사용자가 허용한 경우에만 추가한다.
- 스크린샷·trace·임시 스크립트·QA 보고서를 기본적으로 레포에 저장하지 않는다.
- 리뷰만 요청하면 코드를 수정하지 않는다.
- Browser가 실패한 경우 fallback 여부와 실패 이유를 결과에 명시한다.

## 결과

```md
## 결과

- 통과 또는 실패

## 환경

- URL, 화면 크기, 사용한 Browser 또는 Playwright 경로

## 확인한 흐름

- 실제로 실행한 사용자 행동과 관찰된 상태

## 체크 결과

| 항목        | 결과      | 근거 |
| ----------- | --------- | ---- |
| 페이지 로드 | 통과/실패 | ...  |
| 콘솔        | 통과/실패 | ...  |
| 상호작용    | 통과/실패 | ...  |

## 남은 위험

- 확인하지 못한 화면·브라우저·데이터 상태
```

- 결과와 설명은 한국어로 작성한다.

$ARGUMENTS
