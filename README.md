# Agent Skills

여러 프로젝트에서 재사용하는 Agent Skills 저장소입니다.

## 폴더 구조

```text
.
├── <skill-name>/
│   ├── SKILL.md
│   ├── evals/       # 선택
│   ├── references/  # 선택
│   └── scripts/     # 선택
├── output/          # 생성한 산출물 (스킬 아님)
├── tmp/             # 임시 파일 (스킬 아님)
├── tools/
├── .github/
├── AGENTS.md
└── README.md
```

## 스킬 목록

| 스킬                            | 설명                                                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `skill-router`                  | 복합 작업에 맞는 스킬을 최대 3개까지 제안하고 선택을 기다립니다.                                                |
| `model-orchestration`           | 채팅에서 지정한 모델로 독립 작업을 병렬 위임하고, 상위 세션이 결과를 통합·검토합니다.                          |
| `git-workflow`                  | 브랜치, 커밋, PR의 이름·형식과 작업 절차를 관리합니다.                                                          |
| `development-planning-document` | 개발 요청·기능명세서를 상세 기획서로 정리하고, 전문 초안을 통합해 문서 디자인·화면 배치·DOCX/PDF 렌더링을 검증합니다. |
| `accessibility-review`          | 웹 접근성, 키보드 사용, 스크린리더 지원을 검토합니다.                                                           |
| `frontend-fundamental-review`   | 프론트엔드 코드의 가독성, 응집도, 결합도, 예측 가능성을 리뷰합니다.                                             |
| `frontend-react-performance`    | React·Next.js의 렌더링, 데이터 로딩, 번들 및 성능 문제를 다룹니다.                                              |
| `frontend-ui-testing`           | 화면 렌더링, 상호작용, 반응형 레이아웃, 콘솔 오류를 검증합니다.                                                 |
| `ai-agents-sdk`                 | OpenAI Agents SDK 앱, 도구·핸드오프·에이전트 평가 작업을 지원합니다.                                            |
| `refactor`                      | 기존 동작과 API를 유지하면서 필요한 범위만 리팩토링합니다.                                                      |
| `nestjs-implementation`         | NestJS 백엔드에 기존 구조·네이밍과 동일한 형태로 새 기능을 구현합니다. (실제 프로젝트 기반)                     |
| `nextjs-implementation`         | Next.js(App Router) 프론트에 FSD 레이어와 TanStack Query로 새 화면을 구현합니다. (실제 프로젝트 기반)           |
| `react-implementation`          | Next.js가 아닌 React SPA에 표준 관례로 새 기능을 구현합니다. (표준 관례, 미검증)                                |
| `spring-boot-implementation`    | Spring Boot 백엔드에 표준 계층 구조로 새 기능을 구현합니다. (표준 관례, 미검증)                                 |
| `fastapi-implementation`        | FastAPI 백엔드에 표준 구조로 새 엔드포인트를 구현합니다. (표준 관례, 미검증)                                    |

## 작동 방식

각 스킬은 독립 폴더의 `SKILL.md`에 트리거 조건과 작업 절차를 정의합니다.
요청이 특정 스킬과 맞으면 해당 지침을 읽고 그 범위 안에서 작업합니다.

여러 영역이 섞인 복합 작업에서는 `skill-router`가 먼저 동작합니다.

1. 현재 사용할 수 있는 스킬과 설명을 확인합니다.
2. 요청에 맞는 후보를 최대 3개까지 역할·이유·추천 순서와 함께 제시합니다.
3. 사용자가 선택하기 전에는 파일을 수정하지 않습니다.
4. 선택된 스킬의 `SKILL.md`만 읽고 추천 순서대로 작업합니다.

단일 파일 수정처럼 범위가 분명한 작업은 `skill-router`를 거치지 않습니다.

## 전역 설치

Node.js와 `npx`가 필요합니다. 아래 명령은 [skills CLI 공식 안내](https://github.com/vercel-labs/skills)에 따른 설치·업데이트 방법입니다.

레포마다 `.agents/skills`를 복사하거나 링크로 연결하지 않고, [`skills`
CLI](https://github.com/vercel-labs/skills)로 각 에이전트의 사용자 전역 스킬
경로에 한 번만 설치하면 이후 모든 프로젝트에서 자동으로 사용할 수 있습니다.

Codex만 쓴다면:

```bash
npx skills add https://github.com/ramong26/agents-skill -g -a codex -s '*' -y
```

Codex와 Claude Code를 함께 쓴다면 `-a` 뒤에 에이전트를 공백으로 나열합니다
(콤마 아님). Claude Code의 에이전트 식별자는 `claude`가 아니라
`claude-code`이며, 전역 스킬은 `.agents/skills`가 아니라 `.claude/skills`
경로에 설치됩니다.

```bash
npx skills add https://github.com/ramong26/agents-skill -g -a codex claude-code -s '*' -y
```

설치 가능한 전체 에이전트 목록은 `-a` 없이 `npx skills add https://github.com/ramong26/agents-skill`을
실행하면 인터랙티브 선택 화면에서 확인할 수 있습니다.

이 레포의 전체 스킬을 GitHub 최신 내용으로 설치·갱신하려면 같은 명령을 다시 실행합니다:

```bash
npx skills add https://github.com/ramong26/agents-skill -g -a codex -s '*' -y
```

다른 레포에서 설치한 스킬까지 포함해 모든 전역 설치본을 갱신하려면:

```bash
npx skills update -g
```

복사 설치가 필요하면 `add` 명령에 `--copy`를 붙입니다. 복사본은 원본 파일 수정만으로 갱신되지 않습니다. 설치 상태는 `npx skills ls -g -a codex`로 확인합니다.

## 개발 기획서 스킬 설치·사용

이 스킬만 설치하려면:

```bash
npx skills add https://github.com/ramong26/agents-skill -g -a codex -s development-planning-document -y
```

총괄 폴더 안의 전용 스킬과 `references/`도 함께 유지해야 합니다. 전용 스킬의 `SKILL.md`만 따로 복사하지 않습니다. DOCX/PDF 출력에는 `documents:documents`, `pdf:pdf`, 아키텍처 도식에는 `archify`가 필요하며, 이 레포 설치와 별도로 해당 스킬을 사용할 수 있어야 합니다.

요청 예시:

```text
$development-planning-document
첨부 사업계획서로 편집 가능한 DOCX와 PDF 개발 기획서를 만들어줘.
검정·네이비를 유지하고, 긴 표는 요약과 상세 명세로 나눠줘.
화면안은 실제 배치가 보이는 와이어프레임으로 그려줘.
```

팀장 검토는 [문서 디자인 기준](development-planning-document/references/document-design.md)을 적용합니다. 전체 조판 전에 표지·본문·상세 명세 샘플을 내부 검토하고, 최종 렌더링에서 가독성·표 줄바꿈·빈 공간·정보 위계를 확인합니다. 화면안은 필드와 버튼의 위치 관계를 보여주는 정적 그림으로 작성합니다.

### 설치본 업데이트

GitHub에서 설치한 기획서 스킬만 갱신하려면:

```bash
npx skills update development-planning-document -g
```

이 레포에서 수정한 내용을 GitHub 반영 전에 적용하려면, 레포 루트에서 로컬 소스로 다시 설치합니다. 로컬 재설치와 GitHub 업데이트는 서로 다른 소스를 사용하므로 현재 적용하려는 소스를 선택합니다.

```bash
python tools/validate-skills.py
npx skills add . -g -a codex -s development-planning-document -y
npx skills ls -g -a codex
```

## 검증

```bash
python tools/validate-skills.py
```
