---
name: fastapi-implementation
description: Implement features, routers, or endpoints in FastAPI. Exclude other backends, frontend work, and simple bug fixes.
---

# FastAPI Feature Implementation

FastAPI 기능의 HTTP 계약·업무 로직·저장소 접근을 구현한다.
대상 레포의 실제 구조·관례·기존 경로와 실행 방식을 따른다.

## 적용 전 확인

- 기존 엔드포인트와 관련 업무 함수·DTO·라우터 등록 방식을 확인하고 재사용한다. 요청 없는 전체 폴더 이동이나 새 의존성 도입은 하지 않는다.
- 저장소 접근을 다룰 때 기존 ORM, 동기/비동기, 세션·트랜잭션 경계와 의존성 주입 방식을 확인한다.

## 기능 구현

- 기존 기능의 구현 위치와 호출 방식을 따라 필요한 파일만 변경한다. DB 접근이 없으면 저장소·ORM 모델을 추가하지 않는다.
- 여러 업무를 조합할 때 기존 업무 함수와 DTO를 재사용하고 호출 순서와 값 전달을 구현한다. wrapper·interface·추상 클래스나 빈 템플릿은 필요 없이 만들지 않는다.

## 라우터

- 기존 `APIRouter`와 앱 진입점의 등록 방식을 재사용한다. 새 라우터가 필요하면 기존 관례에 맞춰 `include_router`로 연결하고 경로·prefix·tags를 확인한다.
- 엔드포인트 함수는 `response_model`을 명시해 응답 스키마를 고정한다.

## 스키마 (Pydantic)

- 요청/응답 모델을 `BaseModel` 서브클래스로 분리한다 (`<Feature>Create`, `<Feature>Response` 등). ORM 모델을 그대로 응답에 쓰지 않는다.
- ORM 모델에서 변환이 필요하면 `model_config = ConfigDict(from_attributes=True)`를 응답 스키마에 설정한다.

## 서비스와 의존성 주입

- 비즈니스 로직은 기존 서비스의 함수 또는 클래스를 재사용하고 필요한 동작만 구현한다. 라우터에서 호출하거나, 기존 패턴에서 서비스 주입이 필요하면 `Depends()`를 사용한다.
- DB 접근은 기존 저장소 구현·모델·세션을 재사용한다. 세션 수명·트랜잭션 경계와 동기/비동기 방식은 기존 관례를 유지한다.
- DB 세션은 `Depends(get_db)` 같은 공용 의존성을 재사용한다. 이미 있는 세션 관리 방식을 새로 만들지 않는다.

### `Annotated` 매개변수 선언

`Annotated` 안에는 `Query(...)`, `Depends(...)` 같은 FastAPI 메타데이터를 넣고 기본값은 밖에 둔다.

```python
db: Annotated[Session, Depends(get_db)]
page: Annotated[int, Query(ge=1)] = 1
sort_by: Annotated[SortBy, Query(alias="sortBy")] = "dateTime"
```

- `Query(None)`과 `= Depends(get_db)`는 쓰지 않는다.
- alias는 기존 API 이름을 유지하고, 이미 있는 변환 함수를 재사용한다.

인증 의존성도 동일하다.

```python
credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]
db: Annotated[Session, Depends(get_db)]
```

상세 조회는 `None`이면 기존 404 예외를 반환하고, 값이 있을 때 기존 변환 함수를 호출한다.

```python
if meeting is None:
    raise NOT_FOUND_MEETING
return to_meeting_response(meeting)
```

## 에러 처리

- 실패 케이스는 `HTTPException(status_code=..., detail=...)`으로 명시적인 상태 코드와 함께 던진다.
- 레포에 이미 전역 예외 핸들러(`@app.exception_handler`)가 있으면 그 패턴을 따른다.

## DB 스키마 관리 (알려진 리스크)

- SQLAlchemy `Base.metadata.create_all()`을 프로덕션에서 그대로 쓰면 스키마 변경이 반영되지 않거나 예기치 않게 동작할 수 있다. 표준 관례는 Alembic으로 마이그레이션을 관리하는 것이다. 이 설정은 사용자가 명시적으로 요청하기 전에는 변경하지 않고, 스키마가 바뀌는 기능을 구현할 때만 위험을 알린다.

## 결과

변경 파일, 기존 라우터 등록·업무 함수·DTO·세션의 재사용 여부와
실행한 검증(타입 체크·테스트)을 정리해 보여준다.
