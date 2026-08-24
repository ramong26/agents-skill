---
name: nestjs-implementation
description: This skill should be used when the user asks to implement, add, or scaffold a new feature, module, or endpoint in a NestJS backend — e.g. "NestJS에 회원 기능 추가해줘", "게시글 API 만들어줘", "댓글 기능 백엔드에 구현해줘", "add a new NestJS module/endpoint", "implement this backend feature in NestJS". It generates controller/service/entity/DTO files following this project's established structure and naming. Do not use for non-NestJS backends, frontend work, or simple one-line bug fixes.
---

# NestJS Feature Implementation

NestJS 백엔드에 새 기능(모듈·엔드포인트)을 기존 구조와 동일한 형태로 구현한다.

## 적용 전 확인

- 대상 레포에 이미 다른 폴더 구조나 네이밍 컨벤션이 있으면 이 스킬의 템플릿보다 그것을 우선한다.
- 기존 컨벤션이 없거나 이 스킬이 정의된 레포 자체라면 아래 구조를 기본으로 사용한다.
- 기존 기능(예: 같은 레포의 다른 모듈)이 있으면 그 파일을 먼저 읽고 그대로 따라간다. 이 문서는 참고용 기본값이지 절대 규칙이 아니다.

## 폴더 구조

```text
src/<feature>/
├── <feature>.module.ts
├── controllers/
│   └── <feature>.controller.ts
├── services/
│   └── <feature>.services.ts
├── entities/
│   └── <feature>.entities.ts
└── dtos/
    ├── requests/            # POST·PUT처럼 요청 바디가 있을 때만
    │   └── <action>.dto.ts
    └── responses/
        └── <feature>.dto.ts
```

## 네이밍 규칙

| 대상 | 파일명 | 클래스명 |
| --- | --- | --- |
| 엔티티 | `<feature>.entities.ts` (복수형) | 복수형 PascalCase, 예: `Posts` |
| 서비스 | `<feature>.services.ts` (복수형) | 단수형, 예: `PostService` |
| 컨트롤러 | `<feature>.controller.ts` (단수형) | 단수형, 예: `PostController` |
| 모듈 | `<feature>.module.ts` (단수형) | 단수형, 예: `PostModule` |

테이블명(`@Entity('...')`)도 엔티티 클래스와 동일하게 복수형으로 짓는다.

## 엔티티

- `typeorm`의 `@Entity`, `@Column`, `@PrimaryGeneratedColumn`을 사용한다.
- optional 컬럼은 `@IsOptional()` + `nullable: true`를 함께 쓴다.
- 길이 제한이 필요한 문자열 컬럼에는 `@MaxLength()`를 컬럼 데코레이터와 나란히 붙인다.
- 커스텀 검증이 필요하면 새로 만들지 말고 `src/libs/core/validators`에 이미 있는 데코레이터(예: `IsNotEmptyString`)를 먼저 찾아 재사용한다.

## 응답 DTO

- 엔티티를 빈 채로 상속하는 방식(`class PostDto extends Posts {}`)은 쓰지 않는다. 실제로 응답에 노출할 필드를 명시적으로 선언한다.
- `class-transformer`의 `@Expose()`로 노출 필드를 표시하고, 서비스에서 `plainToInstance(Dto, entity, { excludeExtraneousValues: true })`로 변환해 반환한다.

```ts
import { Expose } from 'class-transformer';

export class PostDto {
    @Expose() id!: number;
    @Expose() title!: string;
    @Expose() createdAt!: Date;
    @Expose() updatedAt!: Date | null;
}
```

## 요청 DTO (POST·PUT 엔드포인트가 있을 때)

- `class-validator` 데코레이터로 검증 규칙을 선언한다.
- 새 엔드포인트를 추가하기 전에 `src/main.ts`에 전역 `ValidationPipe`가 등록돼 있는지 반드시 먼저 확인한다. 없으면 추가한다.

```ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
```

등록돼 있지 않으면 DTO의 `class-validator` 데코레이터가 조용히 무시되어 검증이 전혀 동작하지 않는다.

## 서비스

- `@InjectRepository(<Entity>)`로 Repository를 주입한다.
- 목록 조회에는 정렬·개수 제한 기본값을 명시한다 (`order`, `take` 등 기존 관례 유지).
- 실패할 수 있는 외부 호출(외부 API 등)은 구체적인 `HttpException` 서브클래스(`BadGatewayException` 등)로 감싼다.

## 컨트롤러

- 얇게 유지한다: 검증된 입력을 서비스로 위임하고 반환 타입만 명시한다.
- 라우트 경로는 소문자·케밥 표기를 쓴다 (`@Controller('post')`, `@Get('list')`).

## 모듈 등록

- `TypeOrmModule.forFeature([<Entity>])`, `providers`, `controllers`를 등록한다.
- `src/app.module.ts`의 `imports`에 새 모듈을 추가한다.

## 알려진 리스크 (현재 유지 중, 요청 없이 건드리지 않음)

- `database-options.factory.ts`의 `synchronize: true`가 프로덕션에서도 켜져 있다. 표준 관례는 프로덕션에서 `synchronize: false` + 마이그레이션이지만, 이 설정은 사용자가 명시적으로 요청하기 전에는 변경하지 않는다. 스키마가 크게 바뀌는 기능을 구현할 때는 이 위험을 인지하고 있어야 한다는 점만 알린다.

## 결과

새로 만든 파일 목록, `app.module.ts`·`main.ts` 변경 여부, 실행한 검증(lint·build·test)을 정리해 보여준다.
