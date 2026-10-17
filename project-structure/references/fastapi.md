# FastAPI 구조

```text
app/
├── main.py
├── modules/<업무>/              # public.py·router.py·service.py·schemas.py
│                               # DB 접근이 있을 때 repository.py·models.py
├── usecases/<복합업무>/         # 필요한 router.py·service.py·schemas.py
└── shared/                     # 필요한 설정·DB·인증 기반
```

- 단일 모듈 업무에 usecase를 추가하지 않는다. DB가 없으면 repository·ORM model을
  만들지 않고, 독립 HTTP API가 필요한 모듈에만 router를 둔다.
- 기존 ORM·동기/비동기·세션 수명·트랜잭션·주입 방식을 유지한다.
  필요한 `__init__.py`를 두되 내부 구현을 일괄 공개하지 않는다.
- 다른 백엔드 프레임워크에 FastAPI 파일 이름을 강제하지 않는다.

### 책임과 허용 의존

| 위치 | 책임과 참조 대상 |
|---|---|
| main.py | 앱 구성·등록. 모듈 public의 router·usecase router·shared |
| usecase/router.py | 복합 HTTP 입력·출력. 자기 service·schemas·shared |
| usecase/service.py | 모듈 간 호출 순서·값 전달. 모듈 public·자기 schemas·shared |
| module/public.py | 자기 router·업무 함수·DTO만 명시적으로 재수출 |
| module/router.py | 단일 모듈 HTTP 입력·출력. 자기 service·schemas·shared |
| module/service.py | 자기 업무 규칙. 자기 repository·schemas·models·shared |
| module/repository.py | DB 접근. 자기 models·shared |
| module/models.py | ORM 저장 모델. shared DB 기반 |
| schemas.py | 독립 요청·응답 계약. 상위 업무 계층·ORM model 참조 금지 |
| shared | 공용 기반. modules·usecases·main 참조 금지 |

기본 방향은 `router → service → repository → models`다. schemas는 독립 계약이며
repository → service, schemas → router/models 등 역방향 참조를 허용하지 않는다.

### 공개 진입점과 상위 조합

```python
# app/modules/payment/public.py
from .router import router
from .service import capture_payment
from .schemas import PaymentRequest, PaymentResult

__all__ = ["router", "capture_payment", "PaymentRequest", "PaymentResult"]
```

- 모듈 외부는 public만 사용한다. 필요한 업무 함수·DTO·등록용 router는 여러 이름을
  공개할 수 있지만 repository·ORM model·내부 helper는 공개하지 않는다.
  `__all__`은 공개 목록이며 내부 접근을 자동 차단하지 않는다.
- 모듈 내부는 자기 public을 역참조하지 않는다. main은 모듈 내부 router를 직접
  가져오지 않고 public의 router를 등록한다. usecase router는 main에서 직접 등록한다.
- 모듈끼리는 상대 public도 import하지 않는다. 모듈은 usecase·main을 참조하지 않는다.
- 여러 모듈의 업무 순서와 값 전달은 상위 usecase가 각 모듈 public으로 조합한다.
  필요한 DTO도 public으로 가져오며 모듈 내부 service/repository/schemas에 직접 접근하지 않는다.
- 복합 HTTP API는 usecase router에 둔다. 모듈 router에서 상위 usecase를 호출하거나
  복합 업무를 shared로 옮겨 격리를 우회하지 않는다.
