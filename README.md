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

| 스킬                            | 설명                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `skill-router`                  | 복합 작업에 맞는 스킬을 최대 3개까지 제안하고 선택을 기다립니다.                                                                           |
| `model-orchestration`           | 채팅에서 지정한 모델로 독립 작업을 병렬 위임하고, 상위 세션이 결과를 통합·검토합니다.                                                      |
| `agent-council`                 | 로그인된 Codex·Claude·Gemini(Antigravity CLI `agy`)의 독립 의견을 현재 세션이 비교·검증하고, 한도·인증·실행 오류가 난 참여자는 제외합니다. |
| `git-workflow`                  | 브랜치, 커밋, PR의 이름·형식과 작업 절차를 관리합니다.                                                                                     |
| `agent-docs-structure`          | 에이전트가 읽는 `docs/tasks` + `docs/structure` 문서 구조를 세우고 진행 상태를 동기화·점검합니다.                                          |
| `development-planning-document` | 개발 요청·기능명세서를 개발자용 상세 기획서로 정리하고, 3개 전문 에이전트의 병렬 초안을 팀장이 통합·검증합니다.                            |
| `accessibility-review`          | 웹 접근성, 키보드 사용, 스크린리더 지원을 검토합니다.                                                                                      |
| `frontend-fundamental-review`   | 프론트엔드 코드의 가독성, 응집도, 결합도, 예측 가능성을 리뷰합니다.                                                                        |
| `frontend-react-performance`    | React·Next.js의 렌더링, 데이터 로딩, 번들 및 성능 문제를 다룹니다.                                                                         |
| `frontend-ui-testing`           | 화면 렌더링, 상호작용, 반응형 레이아웃, 콘솔 오류를 검증합니다.                                                                            |
| `ai-agents-sdk`                 | OpenAI Agents SDK 앱, 도구·핸드오프·에이전트 평가 작업을 지원합니다.                                                                       |
| `refactor`                      | 기존 동작과 API를 유지하면서 필요한 범위만 리팩토링합니다.                                                                                 |
| `project-structure`             | 프론트엔드 기능 격리·단일 UI 공개 API·shared 의존 방향과 FastAPI 업무 모듈·usecase 구조를 안내합니다.                                      |
| `nestjs-implementation`         | NestJS 백엔드에 기존 구조·네이밍과 동일한 형태로 새 기능을 구현합니다. (실제 프로젝트 기반)                                                |
| `nextjs-implementation`         | Next.js App Router의 기존 관례와 서버·클라이언트 경계를 유지하며 화면과 기능을 구현합니다.                                                 |
| `react-implementation`          | React SPA의 기존 설정·컴포넌트·라우팅을 재사용하며 화면과 기능을 구현합니다.                                                               |
| `spring-boot-implementation`    | Spring Boot 백엔드에 표준 계층 구조로 새 기능을 구현합니다. (표준 관례, 미검증)                                                            |
| `fastapi-implementation`        | FastAPI 백엔드의 기존 설정을 존중하며 업무별 폴더에 새 엔드포인트를 구현합니다.                                                            |

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

[`skills` CLI](https://github.com/vercel-labs/skills)는 사용자 설정 디렉터리에서
설치된 에이전트를 감지합니다. `-y`를 함께 써서 아래 한 명령으로 이 레포의
전체 스킬을 사용자 전역 경로에 설치합니다. Codex만 감지되면 Codex에,
Codex와 Claude Code가 모두 감지되면 두 에이전트 모두에 설치합니다.

```bash
npx skills add https://github.com/ramong26/agents-skill -g -s '*' -y
```

에이전트를 지정하지 않아야 설치된 에이전트를 감지합니다. Claude Code의 식별자는
`claude-code`이며 전역 스킬은 `.claude/skills`에 설치됩니다. Codex는 공식 CLI가
지원하는 사용자 전역 스킬 경로를 사용합니다. `-y`는 감지된 대상 전체를 선택해
대상 선택을 생략합니다. 에이전트 감지는 실행 파일이 아니라 CLI의 사용자 설정
디렉터리를 기준으로 하므로, CLI를 설치만 하고 한 번도 실행하지 않아 설정 디렉터리가
없다면 감지되지 않을 수 있습니다. 아무 대상도 감지되지 않으면 `skills` CLI는 모든
지원 에이전트를 대상으로 삼으므로, 최소 하나의 Codex 또는 Claude Code 설정 디렉터리가
있는지 확인한 뒤 실행하세요.

이 레포의 스킬을 설치하거나 갱신하려면 같은 명령을 다시 실행하고, 대상 선택
화면이 나오면 필요한 에이전트를 고릅니다. 다른 레포에서 설치한 스킬까지 포함해
모든 전역 설치본을 갱신하려면:

```bash
npx skills update -g
```

복사 설치가 필요하면 `add` 명령에 `--copy`를 붙입니다. 복사본은 원본 파일 수정만으로 갱신되지 않습니다. 설치 상태는 `npx skills ls -g`로 확인합니다.

## 검증

```bash
python tools/validate-skills.py
```
