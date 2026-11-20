#!/usr/bin/env python3
"""Validate the portable Agent Skills subset used by this skill."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple


NAME_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
LINK_RE = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
HOST_SPECIFIC_PATTERNS = {
    "claude-skill-dir": re.compile(r"\$\{CLAUDE_SKILL_DIR\}"),
    "kimi-skill-dir": re.compile(r"\$\{KIMI_SKILL_DIR\}"),
    "claude-dynamic-command": re.compile(r"!\s*`"),
    "positional-arguments": re.compile(r"\$(?:ARGUMENTS|\d+)\b"),
}
COMMON_FRONTMATTER = {"name", "description"}


def parse_frontmatter(text: str) -> Tuple[Dict[str, str], List[str]]:
    errors: List[str] = []
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}, ["SKILL.md must start with YAML frontmatter."]
    try:
        end = next(index for index in range(1, len(lines)) if lines[index].strip() == "---")
    except StopIteration:
        return {}, ["SKILL.md frontmatter is not closed."]

    values: Dict[str, str] = {}
    for number, line in enumerate(lines[1:end], start=2):
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        match = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if not match:
            errors.append(f"Unsupported frontmatter syntax at line {number}: {line!r}")
            continue
        key, value = match.groups()
        values[key] = value.strip().strip("\"'")
    return values, errors


def validate(root: Path) -> Dict[str, object]:
    errors: List[str] = []
    warnings: List[str] = []
    skill_file = root / "SKILL.md"
    if not skill_file.is_file():
        return {"valid": False, "errors": ["SKILL.md not found."], "warnings": []}

    text = skill_file.read_text(encoding="utf-8")
    metadata, parse_errors = parse_frontmatter(text)
    errors.extend(parse_errors)

    name = metadata.get("name", "")
    description = metadata.get("description", "")
    if not name:
        errors.append("Frontmatter name is required.")
    elif not NAME_RE.fullmatch(name):
        errors.append("Frontmatter name must use lowercase alphanumeric single-hyphen form.")
    elif len(name) > 64:
        errors.append("Frontmatter name exceeds 64 characters.")
    if name and root.name != name:
        errors.append(f"Directory name {root.name!r} does not match skill name {name!r}.")

    if not description:
        errors.append("Frontmatter description is required.")
    elif len(description) > 1024:
        errors.append("Frontmatter description exceeds 1024 characters.")

    extra_keys = sorted(set(metadata) - COMMON_FRONTMATTER)
    if extra_keys:
        errors.append(
            "Canonical frontmatter uses host-specific or non-common keys: "
            + ", ".join(extra_keys)
        )

    line_count = len(text.splitlines())
    if line_count > 500:
        errors.append(f"SKILL.md has {line_count} lines; portable ceiling is 500.")

    for name_key, pattern in HOST_SPECIFIC_PATTERNS.items():
        if pattern.search(text):
            errors.append(f"Host-specific construct found in canonical SKILL.md: {name_key}.")

    for raw_target in LINK_RE.findall(text):
        target = raw_target.strip().split("#", 1)[0]
        if not target or re.match(r"^[a-z]+://", target, flags=re.IGNORECASE):
            continue
        linked = (root / target).resolve()
        try:
            linked.relative_to(root.resolve())
        except ValueError:
            errors.append(f"Relative link escapes the skill directory: {raw_target}")
            continue
        if not linked.exists():
            errors.append(f"Broken relative link: {raw_target}")

    python_files = sorted((root / "scripts").glob("*.py")) if (root / "scripts").is_dir() else []
    for script in python_files:
        try:
            compile(script.read_text(encoding="utf-8"), str(script), "exec")
        except SyntaxError as exc:
            errors.append(f"Python syntax error in {script.name}:{exc.lineno}: {exc.msg}")

    openai_yaml = root / "agents" / "openai.yaml"
    if openai_yaml.exists():
        warnings.append(
            "agents/openai.yaml is Codex/ChatGPT metadata; other hosts should ignore it."
        )

    return {
        "valid": not errors,
        "skill": name,
        "root": str(root),
        "skill_lines": line_count,
        "python_scripts": [script.name for script in python_files],
        "errors": errors,
        "warnings": warnings,
        "hosts": {
            "codex": "portable format",
            "claude-code": "portable format; requires .claude/skills discovery path",
            "opencode": "portable format",
            "kimi-code": "portable format",
        },
    }


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate cross-host Agent Skill portability.")
    parser.add_argument(
        "root",
        nargs="?",
        default=str(Path(__file__).resolve().parent.parent),
        help="Skill directory containing SKILL.md.",
    )
    parser.add_argument("--format", choices=("text", "json"), default="text")
    return parser.parse_args(argv)


def render_text(report: Dict[str, object]) -> str:
    lines = [
        "PORTABLE AGENT SKILL VALIDATION",
        "=" * 72,
        f"Skill: {report.get('skill') or '(unknown)'}",
        f"Root: {report.get('root')}",
        f"Result: {'PASS' if report.get('valid') else 'FAIL'}",
        f"SKILL.md lines: {report.get('skill_lines', 'unknown')}",
    ]
    errors = report.get("errors", [])
    warnings = report.get("warnings", [])
    if isinstance(errors, list) and errors:
        lines.append("\nErrors:")
        lines.extend(f"- {item}" for item in errors)
    if isinstance(warnings, list) and warnings:
        lines.append("\nWarnings:")
        lines.extend(f"- {item}" for item in warnings)
    hosts = report.get("hosts", {})
    if isinstance(hosts, dict):
        lines.append("\nHosts:")
        lines.extend(f"- {host}: {status}" for host, status in hosts.items())
    return "\n".join(lines)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)
    root = Path(args.root).expanduser().resolve()
    report = validate(root)
    if args.format == "json":
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(render_text(report))
    return 0 if report.get("valid") else 1


if __name__ == "__main__":
    sys.exit(main())
