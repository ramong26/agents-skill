# Agent Skills Repository Instructions

## Purpose

이 레포는 여러 프로젝트에서 재사용하는 Agent Skills를 관리한다.

## Repository structure

- `<skill-name>/`: 실제 스킬
- `tools/`: 스킬 레포 자체를 검사하는 도구
- `.github/workflows/`: 자동 검증

## Rules

- 하나의 스킬은 하나의 명확한 작업만 담당한다.
- `SKILL.md`에는 핵심 절차만 작성한다.
- 긴 설명과 도메인 지식은 `references/`로 분리한다.
- 반복적이고 결정적인 작업만 `scripts/`에 넣는다.
- 스킬 동작이 바뀌면 반드시 `evals/evals.json`도 수정한다.
- 특정 모델이나 특정 에이전트의 내부 동작에 강하게 의존하지 않는다.
- 비밀키, 사용자 개인정보, 운영 데이터는 eval fixture에 넣지 않는다.
- 계획은 채팅으로 제공하며 계획 저장용 `docs` 폴더를 생성하지 않는다.
- 이미 존재하거나 도구가 생성한 임시 계획 파일은 구현 완료·실제 반영·main 병합 시 삭제하고 빈 상위 폴더도 정리한다.
- 모든 Markdown 파일은 frontmatter, 빈 줄, 코드 블록을 포함해 물리적 200줄 이하로 유지한다.
- 초과하면 중복을 먼저 삭제하고, 긴 내용은 사용 조건·책임별 참조 문서로 분리한다.
  각 링크에 읽을 조건을 표시하며 모든 참조를 순서대로 읽게 하지 않는다.

## Validation

스킬을 추가하거나 수정한 뒤 다음 명령을 실행한다.

```bash
python tools/validate-skills.py
```
