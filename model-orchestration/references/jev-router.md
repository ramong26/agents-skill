# JEV 모델 라우팅

TypeSafe의 공식 질문 타입에는 `Router`가 없다. 고정 후보에서 하나를 고르는 `Choice`로 판단하고, 호출 코드가 결과를 검증한 뒤 선택된 경로를 실행한다. Jev는 하위 에이전트의 코딩 모델이 아니라 하위 실행 경로를 고르는 판단 모델이다.

## 선택 요청

복수 후보일 때만 공식 `typesafe-sdk`의 `TypeSafeClient.system_one()`에 `model="jev-latest"`를 명시해 호출한다. 실행 환경에 `typesafe-sdk` 패키지와 `TYPESAFE_API_KEY`를 미리 설정한다. 선택지는 실제 위임 도구의 `model` 입력이 지원하는 모델 ID만 쓴다.

Run this as a one-off local SDK invocation when no TypeSafe tool is connected; do not add a persistent script for the model judgment. Use the actual response before dispatching any worker.

```python
import math
import os

from typesafe_sdk import Choice, TypeSafeClient

if not os.environ.get("TYPESAFE_API_KEY", "").strip():
    raise RuntimeError("TYPESAFE_API_KEY is not set")

candidates = {
    "<supported-model-id>": "<tool or provider description, if available>",
}

with TypeSafeClient() as client:
    response = client.system_one(
        model="jev-latest",
        state={
            "task_summary": "<short sanitized summary>",
            "task_type": "<implementation | research | review>",
            "risk": "<brief task risk>",
            "role": "<worker | reviewer>",
            "candidate_model_ids": list(candidates),
        },
        questions={
            "worker_model": Choice(
                instructions=(
                    "Choose the candidate model best suited to the task type, risk, and role. "
                    "Choose exactly one candidate model ID."
                ),
                criteria=candidates,
            ),
        },
    )

answer = response.choices["worker_model"]
selected_model_id = answer.choice
confidence = answer.confidence
if not isinstance(selected_model_id, str) or selected_model_id not in candidates:
    raise ValueError("Jev selected a model outside the supported candidates")
if (
    isinstance(confidence, bool)
    or not isinstance(confidence, (int, float))
    or not math.isfinite(confidence)
    or not 0 <= confidence <= 1
):
    raise ValueError("Jev returned no valid confidence value")
```

Provide only a short summary, task type, risk, role, candidate IDs, and descriptions already available from the selected tool or provider. Do not send source code, secrets, credentials, or personal data. If descriptions are unavailable, use `None` for the corresponding Choice criterion; do not invent model capabilities.

## Route and dispatch

- Use the exact `selected_model_id` as the native sub-agent tool's actual `model` override (for example, `collaboration.spawn_agent(model=selected_model_id)`). Do not put it only in the task prompt. Use `mcp__codex_app__create_thread(model=selected_model_id)` only when the user explicitly asked to create a separate Codex task and the tool is allowed.
- Consider `confidence` together with task risk; it is not a correctness guarantee. Do not impose a universal threshold. If the decision is too uncertain for the task's consequences, stop before dispatch and ask the user or get an explicit model choice.
- If only one model is supported, use it without an API call and report `single supported candidate`; do not claim Jev selected it.
- If the SDK, `TYPESAFE_API_KEY`, request, confidence value, or candidate validation is unavailable, do not dispatch under a default model. Report the missing setup or selection failure. Never ask the user to paste an API key into chat.
- Install the official `typesafe-sdk` package and configure `TYPESAFE_API_KEY` in the execution environment before a live Jev route. Do not install dependencies automatically.
