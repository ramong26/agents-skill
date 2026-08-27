---
name: spring-boot-implementation
description: This skill should be used when the user asks to implement, add, or scaffold a new feature, domain, or endpoint in a Spring Boot backend — e.g. "스프링부트에 회원 기능 추가해줘", "게시글 API 만들어줘", "add a new Spring Boot controller/service/repository", "implement this backend feature in Spring Boot". It generates controller/service/repository/entity/DTO classes following standard layered architecture. Do not use for non-Spring backends, frontend work, or simple bug fixes.
---

# Spring Boot Feature Implementation

> 이 스킬은 실제 프로젝트 코드에서 추출한 게 아니라 Spring 공식 문서와 커뮤니티에서
> 널리 쓰이는 표준 관례로 작성됐다. 실제로 이 스택을 쓰는 레포가 생기면 그 코드를
> 기준으로 다시 다듬는다. 그 전까지는 아래 구조를 기본값으로만 쓰고, 대상 레포에
> 이미 다른 컨벤션이 있으면 그것을 우선한다.

## 적용 전 확인

- 대상 레포에 이미 다른 패키지 구조나 네이밍이 있으면 이 스킬의 템플릿보다 그것을 우선한다.
- Java/Kotlin, Gradle/Maven, Lombok 사용 여부를 `build.gradle(.kts)`/`pom.xml`에서 먼저 확인한다.

## 패키지 구조 (도메인 기준)

```text
src/main/java/<base-package>/<feature>/
├── <Feature>Controller.java
├── <Feature>Service.java
├── <Feature>Repository.java      # extends JpaRepository<Entity, Id>
├── <Feature>.java                 # @Entity, 클래스명 단수형
└── dto/
    ├── <Feature>Request.java
    └── <Feature>Response.java
```

## 엔티티

- `@Entity`, `@Table(name = "<plural_table>")`, `@Id` + `@GeneratedValue(strategy = GenerationType.IDENTITY)` (또는 레포 기존 전략)를 사용한다.
- 클래스명은 단수형(예: `Post`), 테이블명은 복수형(예: `posts`)으로 짓는다.
- Lombok이 이미 쓰이고 있으면 `@Getter`, `@NoArgsConstructor` 등으로 보일러플레이트를 줄인다. 없으면 새로 도입하지 않는다.

## DTO와 검증

- 요청/응답 DTO는 엔티티를 그대로 노출하지 않고 별도 클래스(또는 record)로 선언한다.
- 요청 DTO에는 `jakarta.validation.constraints`(`@NotBlank`, `@Size` 등)를 붙이고, 컨트롤러 파라미터에 `@Valid`를 반드시 붙인다.
- 응답 DTO는 엔티티에서 변환하는 정적 팩토리 메서드(`static PostResponse from(Post post)`)나 매퍼로 만든다.

## 컨트롤러

- `@RestController`, `@RequestMapping("/api/<feature>")`를 클래스에 붙인다.
- 생성자 주입을 사용한다 (`final` 필드 + 생성자, 또는 Lombok `@RequiredArgsConstructor`가 이미 쓰이면 그것을 따른다).
- 컨트롤러는 검증된 요청을 서비스에 위임하고 응답 DTO만 반환한다.

## 서비스와 예외 처리

- 비즈니스 로직은 서비스 계층에 둔다. 리포지토리를 직접 컨트롤러에서 호출하지 않는다.
- 존재하지 않는 리소스 등은 커스텀 예외를 던지고, 레포에 이미 `@ControllerAdvice`/`@RestControllerAdvice` 전역 예외 처리기가 있으면 거기에 핸들러를 추가한다. 없으면 새로 만들기 전에 정말 필요한지 확인한다.

## DB 스키마 관리 (알려진 리스크)

- `application.yml`/`application.properties`의 `spring.jpa.hibernate.ddl-auto`가 프로덕션에서 `update`나 `create`로 되어 있으면 위험하다. 프로덕션은 `validate`나 `none` + Flyway/Liquibase 마이그레이션이 표준이다. 이 설정은 사용자가 명시적으로 요청하기 전에는 변경하지 않고, 스키마가 바뀌는 기능을 구현할 때만 위험을 알린다.

## 결과

새로 만든 파일 목록, 변경한 설정 파일 여부, 실행한 검증(빌드·테스트)을 정리해 보여준다.
