"""List discoverable Agent Skills using only their frontmatter metadata."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path


def parse_frontmatter(path: Path) -> dict[str, str]:
    lines = path.read_text(encoding="utf-8").splitlines()
    if not lines or lines[0].strip() != "---":
        return {}

    metadata: dict[str, str] = {}
    for line in lines[1:]:
        if line.strip() == "---":
            break
        key, separator, value = line.partition(":")
        if separator and key.strip() in {"name", "description"}:
            metadata[key.strip()] = value.strip().strip('"\'')
    return metadata


def default_roots() -> list[Path]:
    roots: list[Path] = []
    current = Path.cwd().resolve()
    for directory in (current, *current.parents):
        roots.append(directory / ".agents" / "skills")

    roots.append(Path.home() / ".agents" / "skills")
    configured_root = os.environ.get("AGENT_SKILLS_ROOT")
    if configured_root:
        roots.append(Path(configured_root).expanduser())
    return roots


def collect_skills(roots: list[Path]) -> list[dict[str, str]]:
    skills: list[dict[str, str]] = []
    seen: set[Path] = set()

    for root in roots:
        root = root.resolve()
        if not root.is_dir() or root in seen:
            continue
        seen.add(root)

        for skill_dir in sorted(root.iterdir()):
            skill_file = skill_dir / "SKILL.md"
            if not skill_dir.is_dir() or not skill_file.is_file():
                continue

            metadata = parse_frontmatter(skill_file)
            if not metadata.get("name") or not metadata.get("description"):
                continue
            skills.append(
                {
                    "name": metadata["name"],
                    "description": metadata["description"],
                    "path": str(skill_file),
                }
            )

    return sorted(skills, key=lambda skill: (skill["name"].lower(), skill["path"]))


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--root",
        action="append",
        type=Path,
        help="Additional skills directory to scan; may be repeated.",
    )
    parser.add_argument("--json", action="store_true", help="Print JSON output.")
    args = parser.parse_args()

    skills = collect_skills(default_roots() + (args.root or []))
    if args.json:
        print(json.dumps(skills, ensure_ascii=False, indent=2))
        return 0

    for skill in skills:
        print(f"{skill['name']}: {skill['description']} [{skill['path']}]")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
