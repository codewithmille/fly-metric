# Platform Compatibility

This skill uses the shared Agent Skills directory format:

```text
design-distinctive-ui/
├── SKILL.md
├── references/
├── scripts/
└── agents/openai.yaml
```

`SKILL.md`, `references/`, and `scripts/` are portable. `agents/openai.yaml` is optional Codex/ChatGPT presentation metadata; other hosts can ignore it.

## Common contract

- Keep the directory name and frontmatter `name` identical.
- Keep `name` lowercase with single hyphens and at most 64 characters.
- Keep `description` between 1 and 1024 characters and make triggers explicit.
- Use only `name` and `description` in canonical frontmatter. This is the smallest common subset.
- Keep `SKILL.md` below 500 lines.
- Use relative links for bundled references and scripts.
- Do not depend on host-specific frontmatter, command injection, argument placeholders, or environment variables in the canonical skill.
- Describe tools by capability: "render in a browser," "inspect an image," "run repository tests." Let each host choose its available implementation.
- Treat bundled scripts as optional deterministic helpers. If `python3` is unavailable, follow the documented checks manually.

From the directory containing `SKILL.md`, run:

```bash
python3 scripts/validate_portability.py .
```

If the host exposes the loaded skill at another path, resolve `scripts/` relative to that skill directory rather than a host-specific environment variable.

## Personal installation

The best shared canonical location on one machine is:

```text
~/.agents/skills/design-distinctive-ui/
```

It is discovered directly by:

- Codex
- OpenCode
- Kimi Code

Claude Code uses:

```text
~/.claude/skills/design-distinctive-ui/
```

To keep one source of truth, point that Claude Code path to the canonical `.agents` directory with a symlink on Claude Code versions that support symlinked skill directories. Copying is a fallback, but copies can drift.

## Project installation

For Codex, OpenCode, and Kimi Code:

```text
<repo>/.agents/skills/design-distinctive-ui/
```

For Claude Code:

```text
<repo>/.claude/skills/design-distinctive-ui/
```

Use a relative symlink from the Claude path to the `.agents` canonical directory when the repository and platform policy allow symlinks.

## Invocation

| Host | Automatic use | Explicit use |
| --- | --- | --- |
| Codex | matches `description` | `$design-distinctive-ui` or skill selector |
| Claude Code | matches `description` | `/design-distinctive-ui` |
| OpenCode | agent loads through the `skill` tool | ask for the skill by name; ensure skill permission is allowed |
| Kimi Code | matches `description` | `/skill:design-distinctive-ui` |

## Host notes

### Codex

- Uses the open Agent Skills format.
- Reads user skills from `~/.agents/skills` and project skills from `.agents/skills`.
- Optional `agents/openai.yaml` configures OpenAI UI metadata and invocation policy.

### Claude Code

- Uses the open Agent Skills format and supports supporting files.
- Personal and project discovery uses `.claude/skills`.
- Claude-specific fields such as `allowed-tools`, `context`, and dynamic command injection are intentionally absent because other hosts do not share their semantics.

### OpenCode

- Discovers `.agents/skills` and `.claude/skills` in addition to OpenCode-specific locations.
- Requires `name` and `description` in directory-form skills.
- Skill permission can be allowed, denied, or set to ask in OpenCode configuration.

### Kimi Code

- Discovers personal and project `.agents/skills` directories in addition to Kimi-specific locations.
- Supports `SKILL.md`, references, scripts, and automatic selection from `description`.
- Kimi-specific flow types and argument placeholders are intentionally absent from the canonical version.

## Portability test

The portability validator checks:

- common frontmatter only;
- directory/name agreement;
- description length;
- `SKILL.md` line budget;
- relative resource links;
- absence of host-specific placeholders and dynamic injection;
- Python syntax for bundled scripts.

It cannot prove that a host installed the skill or granted the required filesystem, shell, browser, or network permissions. Test discovery in each installed host separately after linking the canonical directory.

## Official references

- Codex: <https://learn.chatgpt.com/docs/build-skills>
- Claude Code: <https://code.claude.com/docs/en/skills>
- OpenCode: <https://opencode.ai/docs/skills/>
- Kimi Code: <https://moonshotai.github.io/kimi-code/en/customization/skills>
