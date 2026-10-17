---
name: project-structure
description: >-
  Design or revise frontend and FastAPI folder ownership, public entrypoints,
  and import boundaries so tasks need less source reading. Exclude feature
  behavior implementation.
---

# Project Structure

AI와 사람이 작업에 필요한 소스 파일을 적게 읽도록 기능의 구현을 한 소유 단위에
모으고, 좁은 공개 계약으로 연결한다. 공통 기준은 이 본문에, 스택별 규약은 같은
스킬 안의 참조에 둔다. 루트의 다른 스킬 설치나 그 스킬의 문서를 필수로 연결하지 않는다.

## 공통 기준

- 현재 변경의 프레임워크·실제 경로·공개 진입점에 맞춰 선택한 스택의 규약을 적용한다.
  프론트만 바꾸는 작업에 백엔드 설계나 검사를 추가하지 않는다.
- **부모 → 자식은 책임 계층의 의존 방향**이다. 물리적 형제인 `ui/model`이나
  `router.py/service.py`도 선택한 스택의 책임 표에 따라 참조한다.
- 기능 이름은 업무 용어로 짓고, 한 기능 전용 코드는 그 기능 안에 둔다.
  `shared`에는 실제 공용 기반이나 여러 기능이 쓰는 업무와 무관한 코드만 둔다.
- 기존 경로·네이밍·별칭을 책임 계층에 대응시킨다. 기존 관례의 경계 위반을 새 코드에
  복제하거나, 요청 없이 전체 폴더를 이동하고 기존 공개 API를 폐기하지 않는다.
- 실제 코드가 없는 폴더·파일, 공개용 wrapper·추상 클래스는 만들지 않는다.
  기존 Provider·DB 세션·유틸을 재사용하며 구조를 위해 라이브러리를 추가하지 않는다.
- 조합은 공개 계약으로 연결한다. 재수출에 계약이 없으면 실제 props·함수·DTO 선언을
  확인하고, 타입으로 불명확한 의미만 해당 선언의 주석·docstring에 보완한다.
- 내부 수정·오류 추적에 필요한 구현 읽기는 허용한다. 읽는 파일 수에 고정 상한을
  두거나 별도 계약 문서를 만들지 않으며, 읽기 허용을 내부 경로 import 허용으로 바꾸지 않는다.
- 정적·타입·상대 경로·재수출·동적 import 모두 같은 경계를 지킨다.
  같은 책임 계층의 내부 helper 참조는 비순환으로 허용하며 상위·다른 기능 참조는 허용하지 않는다.

## 작업에 필요한 내부 참조

| 현재 작업 | 적용할 참조 |
|---|---|
| React·Next.js의 폴더·공개 UI·의존 경계 | [프론트엔드 구조](references/frontend.md) |
| FastAPI의 모듈·public·usecase 경계 | [FastAPI 구조](references/fastapi.md) |

현재 작업이 양쪽을 다룰 때만 둘 다 읽는다. 레포가 풀스택이라는 이유로 모든 참조를
읽지 않는다. 상세 검사 설정 예시는 아래 조건에 해당할 때만 선택한다.

## 결과와 확인

- 폴더 배치·소유 단위·공개 진입점·허용 의존 방향을 함께 제시한다.
- 변경과 관련된 import의 실제 목적지·내부 접근·역방향·순환·공개 export를 확인한다.
  기존 architecture 검사·타입 검사·lint·테스트·build는 변경 범위에 맞게 실행한다.
- 검사 설정을 검토·수정할 때만 [ESLint/import-linter 예시](references/boundary-enforcement.md)의
  해당 절을 참고한다. 기본 구조 설계에는 이 선택 문서를 읽을 필요가 없다.
- 도구·수동 확인 범위와 미실행 항목을 구분한다. 새 검사기 도입을 의무 제안하거나
  스킬 형식 검사·문자열 패턴 검사만으로 전체 프로젝트 경계 검증을 완료했다고 주장하지 않는다.
