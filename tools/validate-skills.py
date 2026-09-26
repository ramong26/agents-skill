#!/usr/bin/env python3
"""Validate skill frontmatter and eval fixtures using only the standard library."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ALLOWED_FRONTMATTER_KEYS = {"name", "description", "license", "allowed-tools", "metadata"}
NAME_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
KEY_PATTERN = re.compile(r"^([A-Za-z0-9_-]+):(?:[ \t]*(.*))?$")


def skill_files() -> list[Path]:
    return sorted(
        path
        for path in ROOT.rglob("SKILL.md")
        if not any(part.startswith(".") or part == "tools" for part in path.relative_to(ROOT).parts[:-1])
    )


def unquote(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] == "'":
        return value[1:-1].replace("''", "'")
    if len(value) >= 2 and value[0] == value[-1] == '"':
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value[1:-1]
    return value


def read_frontmatter(path: Path) -> tuple[dict[str, str], str]:
    lines = path.read_text(encoding="utf-8").splitlines()
    if not lines or lines[0] != "---":
        raise ValueError("missing YAML frontmatter opening delimiter")

    try:
        end = lines.index("---", 1)
    except ValueError as error:
        raise ValueError("missing YAML frontmatter closing delimiter") from error

    fields: dict[str, str] = {}
    for index, line in enumerate(lines[1:end], start=1):
        if not line or line[0].isspace() or line.lstrip().startswith("#"):
            continue
        match = KEY_PATTERN.match(line)
        if not match:
            raise ValueError(f"invalid top-level frontmatter entry on line {index + 1}")
        key, value = match.groups()
        if key in fields:
            raise ValueError(f"duplicate frontmatter key: {key}")
        fields[key] = value or ""

    unexpected = set(fields) - ALLOWED_FRONTMATTER_KEYS
    if unexpected:
        raise ValueError(f"unexpected frontmatter key(s): {', '.join(sorted(unexpected))}")

    description = fields.get("description", "").strip()
    if description in {">", ">-", ">+", "|", "|-", "|+"}:
        block: list[str] = []
        description_index = next(
            index for index, line in enumerate(lines[1:end], start=1)
            if line.startswith("description:")
        )
        for line in lines[description_index + 1 : end]:
            if line and not line[0].isspace():
                break
            block.append(line.strip())
        description = " ".join(part for part in block if part)
    else:
        description = unquote(description)

    fields["description"] = description
    return fields, "\n".join(lines[end + 1 :])


def validate_skill(path: Path) -> tuple[list[str], int]:
    issues: list[str] = []
    try:
        fields, body = read_frontmatter(path)
    except (OSError, UnicodeError, ValueError) as error:
        return [str(error)], 0

    name = unquote(fields.get("name", ""))
    description = fields.get("description", "").strip()
    if not name:
        issues.append("missing name")
    elif not NAME_PATTERN.fullmatch(name) or len(name) > 64:
        issues.append("name must be lowercase hyphen-case and at most 64 characters")
    elif name != path.parent.name:
        issues.append(f"name '{name}' does not match folder '{path.parent.name}'")

    if not description:
        issues.append("missing description")
    elif len(description) > 1024:
        issues.append("description exceeds 1024 characters")
    elif description.startswith("[TODO:"):
        issues.append("description contains an unfinished TODO placeholder")

    if not body.strip():
        issues.append("skill instructions are empty")
    elif re.search(r"(?m)^\s{0,3}\[TODO:[^\n]*\]\s*$", body):
        issues.append("skill instructions contain an unfinished TODO placeholder")

    eval_path = path.parent / "evals" / "evals.json"
    case_count = 0
    if not eval_path.is_file():
        issues.append("missing evals/evals.json")
    else:
        try:
            data = json.loads(eval_path.read_text(encoding="utf-8"))
        except (OSError, UnicodeError, json.JSONDecodeError) as error:
            issues.append(f"invalid evals/evals.json: {error}")
        else:
            if not isinstance(data, dict):
                issues.append("evals/evals.json must contain a JSON object")
            else:
                if data.get("skill_name") != name:
                    issues.append("evals/evals.json skill_name does not match skill name")
                cases = data.get("cases", data.get("evals"))
                if not isinstance(cases, list):
                    issues.append("evals/evals.json must contain a cases or evals array")
                else:
                    case_count = len(cases)
                    seen_ids: set[str] = set()
                    for index, case in enumerate(cases, start=1):
                        if not isinstance(case, dict):
                            issues.append(f"eval case {index} must be an object")
                            continue
                        if not isinstance(case.get("prompt"), str) or not case["prompt"].strip():
                            issues.append(f"eval case {index} is missing a prompt")
                        if not (case.get("expected_behaviors") or case.get("expected_output")):
                            issues.append(f"eval case {index} is missing expected behavior/output")
                        case_id = case.get("id")
                        if case_id:
                            if case_id in seen_ids:
                                issues.append(f"duplicate eval case id: {case_id}")
                            seen_ids.add(case_id)

    return issues, case_count


def main() -> int:
    files = skill_files()
    if not files:
        print("No skills found.", file=sys.stderr)
        return 1

    total_cases = 0
    failures = 0
    for path in files:
        issues, case_count = validate_skill(path)
        total_cases += case_count
        relative = path.relative_to(ROOT).as_posix()
        if issues:
            failures += len(issues)
            for issue in issues:
                print(f"ERROR {relative}: {issue}")

    if failures:
        print(f"Validation failed: {failures} issue(s) across {len(files)} skill(s).")
        return 1

    print(f"Validated {len(files)} skills and {total_cases} eval case(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
