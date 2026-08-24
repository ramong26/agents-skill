"""Validate the repository's Agent Skills structure."""

from __future__ import annotations

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SKILLS_DIR = ROOT / ".agents" / "skills"


def frontmatter(path: Path) -> dict[str, str]:
    lines = path.read_text(encoding="utf-8-sig").splitlines()
    if not lines or lines[0].strip() != "---":
        raise ValueError("missing YAML frontmatter")

    values: dict[str, str] = {}
    for line in lines[1:]:
        if line.strip() == "---":
            return values
        key, separator, value = line.partition(":")
        if separator:
            values[key.strip()] = value.strip().strip('"\'')
    raise ValueError("unterminated YAML frontmatter")


def validate_skill(skill_dir: Path) -> list[str]:
    errors: list[str] = []
    skill_file = skill_dir / "SKILL.md"
    evals_file = skill_dir / "evals" / "evals.json"

    if not skill_file.is_file():
        errors.append(f"{skill_dir.name}: missing SKILL.md")
    else:
        try:
            metadata = frontmatter(skill_file)
            for key in ("name", "description"):
                if not metadata.get(key):
                    errors.append(f"{skill_file}: missing frontmatter field '{key}'")
            if metadata.get("name") != skill_dir.name:
                errors.append(f"{skill_file}: name must match directory '{skill_dir.name}'")
        except (OSError, ValueError) as error:
            errors.append(f"{skill_file}: {error}")

    if not evals_file.is_file():
        errors.append(f"{skill_dir.name}: missing evals/evals.json")
    else:
        try:
            data = json.loads(evals_file.read_text(encoding="utf-8"))
            cases = data.get("cases", data.get("evals")) if isinstance(data, dict) else None
            if not isinstance(cases, list) or not cases:
                errors.append(f"{evals_file}: expected a non-empty 'cases' or 'evals' list")
        except (OSError, json.JSONDecodeError) as error:
            errors.append(f"{evals_file}: {error}")

    return errors


def main() -> int:
    if not SKILLS_DIR.is_dir():
        print(f"Missing skills directory: {SKILLS_DIR}")
        return 1

    errors = [
        error
        for skill_dir in sorted(SKILLS_DIR.iterdir())
        if skill_dir.is_dir() and not skill_dir.name.startswith(".")
        for error in validate_skill(skill_dir)
    ]

    if errors:
        print("Skill validation failed:")
        print("\n".join(f"- {error}" for error in errors))
        return 1

    print("Skill validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
