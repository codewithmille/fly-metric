#!/usr/bin/env python3
"""Static UI quality heuristic for HTML and CSS.

This intentionally reports review prompts, not WCAG conformance or design truth.
It uses only the Python standard library and performs no network access.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple


SEVERITY_ORDER = {"critical": 0, "major": 1, "minor": 2, "enhancement": 3}
FAIL_LEVELS = {"critical": 0, "major": 1, "minor": 2, "never": -1}
WEIGHTS = {"critical": 24, "major": 8, "minor": 3, "enhancement": 1}

GENERIC_CTA = {
    "get started",
    "learn more",
    "click here",
    "read more",
    "try it free",
    "sign up now",
    "join today",
    "contact us",
    "book a demo",
}

BUZZWORDS = {
    "seamless",
    "powerful",
    "revolutionary",
    "next-gen",
    "cutting-edge",
    "innovative",
    "transform",
    "unlock",
    "leverage",
    "supercharge",
    "streamline",
    "empower",
    "game-changing",
    "world-class",
    "state-of-the-art",
    "frictionless",
    "holistic",
}

PLACEHOLDER_NAMES = {"jane doe", "john doe", "john smith", "example user"}
EMOJI_RE = re.compile(
    "[\U0001F300-\U0001FAFF\u2600-\u27BF]",
    flags=re.UNICODE,
)
METRIC_RE = re.compile(
    r"(?<![\w.])(?:\+?\d+(?:\.\d+)?\s*(?:%|x|×|k\+?|m\+?|hours?|mins?|seconds?))\b",
    flags=re.IGNORECASE,
)


@dataclass
class Finding:
    severity: str
    rule: str
    message: str
    source: str
    evidence: str = ""
    recommendation: str = ""


class UIHTMLParser(HTMLParser):
    """Collect enough structure for deterministic, conservative checks."""

    TEXT_TAGS = {"a", "button", "h1", "h2", "h3", "h4", "h5", "h6"}

    def __init__(self, source: str) -> None:
        super().__init__(convert_charrefs=True)
        self.source = source
        self.elements: List[Tuple[str, Dict[str, str], int]] = []
        self.text_records: List[Tuple[str, Dict[str, str], str, int]] = []
        self.labels_for = set()
        self.visible_text: List[str] = []
        self._capture_stack: List[Dict[str, object]] = []

    def handle_starttag(
        self, tag: str, attrs: Sequence[Tuple[str, Optional[str]]]
    ) -> None:
        data = {key.lower(): (value or "") for key, value in attrs}
        tag = tag.lower()
        line = self.getpos()[0]
        self.elements.append((tag, data, line))
        if tag == "label" and data.get("for"):
            self.labels_for.add(data["for"])
        if tag in self.TEXT_TAGS:
            self._capture_stack.append(
                {"tag": tag, "attrs": data, "line": line, "parts": []}
            )

    def handle_startendtag(
        self, tag: str, attrs: Sequence[Tuple[str, Optional[str]]]
    ) -> None:
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        for index in range(len(self._capture_stack) - 1, -1, -1):
            record = self._capture_stack[index]
            if record["tag"] == tag:
                record = self._capture_stack.pop(index)
                text = " ".join(str(part).strip() for part in record["parts"])
                text = re.sub(r"\s+", " ", text).strip()
                self.text_records.append(
                    (
                        str(record["tag"]),
                        dict(record["attrs"]),  # type: ignore[arg-type]
                        text,
                        int(record["line"]),
                    )
                )
                break

    def handle_data(self, data: str) -> None:
        clean = re.sub(r"\s+", " ", data).strip()
        if clean:
            self.visible_text.append(clean)
            for record in self._capture_stack:
                parts = record["parts"]
                assert isinstance(parts, list)
                parts.append(clean)


def add(
    findings: List[Finding],
    severity: str,
    rule: str,
    message: str,
    source: str,
    evidence: str = "",
    recommendation: str = "",
) -> None:
    findings.append(
        Finding(
            severity=severity,
            rule=rule,
            message=message,
            source=source,
            evidence=evidence[:240],
            recommendation=recommendation,
        )
    )


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="utf-8", errors="replace")


def analyze_html(path: Path, findings: List[Finding]) -> UIHTMLParser:
    text = read_text(path)
    parser = UIHTMLParser(str(path))
    parser.feed(text)
    elements = parser.elements
    tags = [tag for tag, _, _ in elements]

    html_elements = [(attrs, line) for tag, attrs, line in elements if tag == "html"]
    if html_elements and not html_elements[0][0].get("lang"):
        add(
            findings,
            "major",
            "html-language",
            "The page has no language declaration.",
            f"{path}:{html_elements[0][1]}",
            recommendation='Set a correct lang attribute such as lang="en" or lang="es".',
        )

    if "title" not in tags:
        add(
            findings,
            "major",
            "page-title",
            "The document has no title element.",
            str(path),
            recommendation="Add a concise, unique page title.",
        )

    if "main" not in tags:
        add(
            findings,
            "minor",
            "main-landmark",
            "No main landmark was found.",
            str(path),
            recommendation="Wrap the primary page content in <main>.",
        )

    h1_count = tags.count("h1")
    if h1_count == 0:
        add(
            findings,
            "major",
            "heading-h1",
            "No h1 was found.",
            str(path),
            recommendation="Give the page one clear primary heading.",
        )
    elif h1_count > 1:
        add(
            findings,
            "minor",
            "heading-h1",
            f"{h1_count} h1 elements were found.",
            str(path),
            recommendation="Confirm that the heading structure has one clear page-level title.",
        )

    prior_heading = 0
    for tag, _, text_value, line in parser.text_records:
        if not tag.startswith("h") or len(tag) != 2 or not tag[1].isdigit():
            continue
        level = int(tag[1])
        if not text_value:
            add(
                findings,
                "major",
                "empty-heading",
                f"Empty {tag} element.",
                f"{path}:{line}",
                recommendation="Remove the empty heading or give it meaningful text.",
            )
        if prior_heading and level > prior_heading + 1:
            add(
                findings,
                "minor",
                "heading-order",
                f"Heading order jumps from h{prior_heading} to h{level}.",
                f"{path}:{line}",
                evidence=text_value,
                recommendation="Use heading levels to express hierarchy, not visual size.",
            )
        prior_heading = level

    for tag, attrs, line in elements:
        source = f"{path}:{line}"
        if tag == "img" and "alt" not in attrs:
            add(
                findings,
                "major",
                "image-alt",
                "Image has no alt attribute.",
                source,
                evidence=attrs.get("src", ""),
                recommendation='Use descriptive alt text or alt="" when decorative.',
            )
        if tag == "button" and not attrs.get("type"):
            add(
                findings,
                "minor",
                "button-type",
                "Button has no explicit type.",
                source,
                recommendation='Set type="button" unless it intentionally submits a form.',
            )
        if tag == "a" and attrs.get("href", "") in {"", "#"}:
            add(
                findings,
                "major",
                "empty-link-target",
                "Link has an empty or placeholder destination.",
                source,
                recommendation="Wire a real destination or use a button for an action.",
            )
        if tag in {"input", "textarea", "select"}:
            input_type = attrs.get("type", "text").lower()
            if input_type in {"hidden", "button", "submit", "reset", "image"}:
                continue
            control_id = attrs.get("id")
            labeled = bool(
                attrs.get("aria-label")
                or attrs.get("aria-labelledby")
                or (control_id and control_id in parser.labels_for)
            )
            if not labeled:
                add(
                    findings,
                    "critical",
                    "form-label",
                    f"{tag} has no programmatically associated label.",
                    source,
                    evidence=attrs.get("name", control_id or ""),
                    recommendation="Use a visible <label for>, aria-labelledby, or an appropriate accessible name.",
                )
        role = attrs.get("role", "").lower()
        if tag == "div" and role in {"button", "link"} and not attrs.get("tabindex"):
            add(
                findings,
                "major",
                "custom-control-keyboard",
                f"div with role={role!r} has no keyboard focus path.",
                source,
                recommendation="Prefer a native element or implement complete keyboard behavior.",
            )
        if tag in {"video", "audio"} and "autoplay" in attrs:
            if tag == "audio" or "muted" not in attrs:
                add(
                    findings,
                    "critical",
                    "autoplay-audio",
                    "Autoplay media may start with sound.",
                    source,
                    recommendation="Do not autoplay sound; provide explicit user controls.",
                )
        if tag == "img" and attrs.get("loading", "").lower() == "lazy":
            class_id = f"{attrs.get('class', '')} {attrs.get('id', '')}".lower()
            if "hero" in class_id or "lcp" in class_id:
                add(
                    findings,
                    "major",
                    "lazy-lcp",
                    "A likely hero/LCP image is lazy-loaded.",
                    source,
                    evidence=attrs.get("src", ""),
                    recommendation="Prioritize the real LCP asset and reserve its dimensions.",
                )

    for tag, _, text_value, line in parser.text_records:
        normalized = text_value.casefold().strip()
        if tag in {"a", "button"} and not normalized:
            add(
                findings,
                "critical",
                "control-name",
                f"{tag} has no visible text; verify an accessible name exists.",
                f"{path}:{line}",
                recommendation="Provide visible text or a correct accessible name for icon-only controls.",
            )
        if tag in {"a", "button"} and normalized in GENERIC_CTA:
            add(
                findings,
                "minor",
                "generic-cta",
                f"Generic action label: {text_value!r}.",
                f"{path}:{line}",
                recommendation="Name the concrete action or outcome when context does not already make it clear.",
            )
        if tag in {"a", "button"} and EMOJI_RE.search(text_value):
            add(
                findings,
                "minor",
                "emoji-control",
                "A control uses emoji as part of its visual language.",
                f"{path}:{line}",
                evidence=text_value,
                recommendation="Confirm this is intentional and consistent across platforms.",
            )

    visible = " ".join(parser.visible_text)
    words = re.findall(r"[A-Za-z][A-Za-z-]+", visible.casefold())
    buzzword_counts = Counter(word for word in words if word in BUZZWORDS)
    if sum(buzzword_counts.values()) >= 3:
        add(
            findings,
            "minor",
            "buzzword-cluster",
            "Multiple generic marketing buzzwords were found.",
            str(path),
            evidence=", ".join(f"{word}×{count}" for word, count in buzzword_counts.items()),
            recommendation="Replace vague claims with concrete product language and supplied evidence.",
        )

    lower_visible = visible.casefold()
    names = sorted(name for name in PLACEHOLDER_NAMES if name in lower_visible)
    if names:
        add(
            findings,
            "minor",
            "placeholder-name",
            "Generic placeholder identity appears in visible content.",
            str(path),
            evidence=", ".join(names),
            recommendation="Use clearly labeled sample data or audience-appropriate realistic fixtures.",
        )

    metrics = METRIC_RE.findall(visible)
    sample_data_is_labeled = re.search(
        r"\b(?:sample|demo|fictional|illustrative|placeholder)\s+data\b",
        lower_visible,
    )
    if metrics and not sample_data_is_labeled:
        add(
            findings,
            "enhancement",
            "claim-source",
            "Quantitative claims need a source check.",
            str(path),
            evidence=", ".join(metrics[:8]),
            recommendation="Verify every metric came from the brief or label it as sample data.",
        )

    structural_text = " ".join(
        f"{attrs.get('id', '')} {attrs.get('class', '')}"
        for tag, attrs, _ in elements
        if tag in {"section", "header", "footer", "main"}
    ).casefold()
    sequence = ["hero", "feature", "testimonial", "pricing", "cta", "footer"]
    positions = [structural_text.find(item) for item in sequence]
    present = [(item, pos) for item, pos in zip(sequence, positions) if pos >= 0]
    if len(present) >= 5 and [pos for _, pos in present] == sorted(pos for _, pos in present):
        add(
            findings,
            "major",
            "template-section-order",
            "Section names suggest the common AI landing-page sequence.",
            str(path),
            evidence=" → ".join(item for item, _ in present),
            recommendation="Confirm the order follows user questions and evidence, not a template.",
        )

    return parser


def analyze_css(path: Path, findings: List[Finding], has_interaction: bool) -> None:
    css = read_text(path)
    compact = re.sub(r"/\*.*?\*/", "", css, flags=re.DOTALL)
    lower = compact.casefold()

    rules = [
        (
            r"\btransition(?:-property)?\s*:\s*all\b",
            "major",
            "transition-all",
            "CSS uses transition: all.",
            "List only the properties that should animate.",
        ),
        (
            r"\b(?:width|height|top|left|right|bottom|margin|padding)\b[^;{}]*\btransition\b|\btransition[^;{}]*(?:width|height|top|left|right|bottom|margin|padding)",
            "major",
            "layout-transition",
            "A layout property appears to be transitioned.",
            "Prefer transform/opacity or verify that reflow is intentional.",
        ),
        (
            r"grid-template-columns\s*:\s*repeat\(\s*3\s*,\s*(?:minmax\([^)]*\)|1fr)\s*\)",
            "minor",
            "three-equal-columns",
            "A three-equal-column grid was found.",
            "Confirm the content truly has equal priority and the structure is brief-specific.",
        ),
        (
            r"background-clip\s*:\s*text|-webkit-background-clip\s*:\s*text",
            "minor",
            "gradient-text-risk",
            "Text clipping is used; gradient display text is a common AI tell.",
            "Confirm the effect is brand-specific and readable, or use solid type.",
        ),
        (
            r"\b(?:width|min-width|max-width)\s*:\s*100vw\b",
            "major",
            "viewport-width",
            "100vw can create horizontal overflow on scrollbar-visible viewports.",
            "Prefer width: 100% unless viewport width is specifically required.",
        ),
        (
            r"\bheight\s*:\s*100vh\b",
            "minor",
            "unstable-viewport-height",
            "100vh may jump or clip under mobile browser chrome.",
            "Use dynamic viewport units or a content-based minimum where appropriate.",
        ),
        (
            r"\bz-index\s*:\s*(?:[1-9]\d{3,})\b",
            "minor",
            "z-index-escalation",
            "A very large z-index value was found.",
            "Use a documented layer scale.",
        ),
        (
            r"\bhover[^,{]*\bscale\(|:hover[^{}]*\{[^}]*transform\s*:[^;}]*scale\(\s*1\.0?5",
            "minor",
            "uniform-hover-scale",
            "A generic hover-scale pattern was found.",
            "Use one interaction signal tied to the component's role.",
        ),
    ]

    for pattern, severity, rule, message, recommendation in rules:
        match = re.search(pattern, lower, flags=re.DOTALL)
        if match:
            line = compact.count("\n", 0, match.start()) + 1
            add(
                findings,
                severity,
                rule,
                message,
                f"{path}:{line}",
                evidence=re.sub(r"\s+", " ", match.group(0)),
                recommendation=recommendation,
            )

    gradient_blocks = re.findall(r"(?:linear|radial)-gradient\([^)]*\)", lower)
    trendy = [
        block
        for block in gradient_blocks
        if any(color in block for color in ("purple", "violet", "magenta"))
        and any(color in block for color in ("blue", "cyan"))
    ]
    if trendy:
        add(
            findings,
            "minor",
            "generic-gradient-risk",
            "A purple/violet-to-blue/cyan gradient was found.",
            str(path),
            evidence=trendy[0],
            recommendation="Confirm it derives from the brand or product instead of a generic AI aesthetic.",
        )

    animation_present = bool(
        re.search(r"@keyframes|\banimation(?:-name)?\s*:|scroll-behavior\s*:\s*smooth", lower)
    )
    if animation_present and "prefers-reduced-motion" not in lower:
        add(
            findings,
            "major",
            "reduced-motion",
            "Motion exists without a prefers-reduced-motion rule.",
            str(path),
            recommendation="Provide an equivalent reduced-motion state that preserves information.",
        )

    if has_interaction and ":focus-visible" not in lower:
        add(
            findings,
            "major",
            "focus-visible",
            "Interactive HTML was found but no :focus-visible rule appears in this CSS input.",
            str(path),
            recommendation="Add a visible, non-animated focus indicator or verify it comes from another loaded stylesheet.",
        )

    if re.search(r"(?:outline\s*:\s*none|outline\s*:\s*0)\b", lower) and ":focus-visible" not in lower:
        add(
            findings,
            "critical",
            "focus-outline-removal",
            "Focus outlines are removed without a detected focus-visible replacement.",
            str(path),
            recommendation="Restore a visible focus indicator.",
        )

    shadows = len(re.findall(r"\bbox-shadow\s*:", lower))
    if shadows >= 6:
        add(
            findings,
            "minor",
            "shadow-overuse-risk",
            f"{shadows} box-shadow declarations were found.",
            str(path),
            recommendation="Confirm shadows form a small elevation system and every use communicates hierarchy.",
        )

    blur_count = len(re.findall(r"\b(?:backdrop-filter|-webkit-backdrop-filter)\s*:[^;]*blur", lower))
    if blur_count >= 3:
        add(
            findings,
            "minor",
            "blur-overuse-risk",
            f"{blur_count} backdrop blur declarations were found.",
            str(path),
            recommendation="Reserve blur for real depth or overlay relationships.",
        )

    radius_values = [
        float(value)
        for value in re.findall(r"\bborder-radius\s*:\s*(\d+(?:\.\d+)?)px", lower)
    ]
    if len(radius_values) >= 6 and sum(value >= 16 for value in radius_values) / len(radius_values) >= 0.6:
        add(
            findings,
            "minor",
            "rounded-everything-risk",
            "Most explicit radius values are 16px or larger.",
            str(path),
            recommendation="Confirm the page has an intentional radius grammar instead of rounded containment everywhere.",
        )

    family_values = re.findall(r"\bfont-family\s*:\s*([^;}{]+)", compact, flags=re.IGNORECASE)
    normalized_families = {
        re.sub(r"\s+", " ", value.strip().casefold()) for value in family_values
    }
    if len(normalized_families) > 5:
        add(
            findings,
            "minor",
            "font-family-drift",
            f"{len(normalized_families)} distinct font-family declarations were found.",
            str(path),
            recommendation="Confirm they resolve to no more than three intentional type roles.",
        )


def grade(findings: Iterable[Finding]) -> Tuple[int, str]:
    # Repeated instances of one rule matter in the report, but should not make
    # a ten-link prototype score ten times worse than a one-link prototype.
    unique_rules = {(item.severity, item.rule) for item in findings}
    penalty = sum(WEIGHTS[severity] for severity, _ in unique_rules)
    score = max(0, 100 - penalty)
    if score >= 95:
        letter = "A"
    elif score >= 85:
        letter = "B"
    elif score >= 70:
        letter = "C"
    elif score >= 55:
        letter = "D"
    else:
        letter = "F"
    return score, letter


def render_text(report: Dict[str, object]) -> str:
    summary = report["summary"]
    assert isinstance(summary, dict)
    lines = [
        "UI QUALITY STATIC REVIEW",
        "=" * 72,
        f"Score: {summary['score']}/100 ({summary['grade']})",
        "This is a heuristic review, not WCAG conformance or visual proof.",
        "",
    ]
    findings = report["findings"]
    assert isinstance(findings, list)
    if not findings:
        lines.append("No configured static patterns were detected.")
    else:
        for item in findings:
            assert isinstance(item, dict)
            lines.append(
                f"[{str(item['severity']).upper()}] {item['rule']} — {item['source']}"
            )
            lines.append(f"  {item['message']}")
            if item.get("evidence"):
                lines.append(f"  Evidence: {item['evidence']}")
            if item.get("recommendation"):
                lines.append(f"  Fix/check: {item['recommendation']}")
            lines.append("")
    counts = summary["counts"]
    assert isinstance(counts, dict)
    lines.append(
        "Counts: "
        + " · ".join(
            f"{name}={counts.get(name, 0)}"
            for name in ("critical", "major", "minor", "enhancement")
        )
    )
    return "\n".join(lines)


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Static HTML/CSS review for accessibility and generic AI UI patterns."
    )
    parser.add_argument("--html", nargs="+", required=True, help="HTML file(s) to inspect.")
    parser.add_argument("--css", nargs="*", default=[], help="CSS file(s) to inspect.")
    parser.add_argument("--format", choices=("text", "json"), default="text")
    parser.add_argument("--output", help="Optional report output path.")
    parser.add_argument(
        "--fail-on",
        choices=("critical", "major", "minor", "never"),
        default="critical",
        help="Exit non-zero when this severity or worse is present.",
    )
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)
    html_paths = [Path(value).expanduser().resolve() for value in args.html]
    css_paths = [Path(value).expanduser().resolve() for value in args.css]

    missing = [str(path) for path in html_paths + css_paths if not path.is_file()]
    if missing:
        print("Missing input file(s): " + ", ".join(missing), file=sys.stderr)
        return 2

    findings: List[Finding] = []
    has_interaction = False
    for path in html_paths:
        parsed = analyze_html(path, findings)
        has_interaction = has_interaction or any(
            tag in {"a", "button", "input", "textarea", "select", "summary"}
            or attrs.get("role") in {"button", "link", "tab", "menuitem"}
            for tag, attrs, _ in parsed.elements
        )
    for path in css_paths:
        analyze_css(path, findings, has_interaction=has_interaction)

    findings.sort(key=lambda item: (SEVERITY_ORDER[item.severity], item.source, item.rule))
    score, letter = grade(findings)
    counts = Counter(item.severity for item in findings)
    report: Dict[str, object] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "inputs": {
            "html": [str(path) for path in html_paths],
            "css": [str(path) for path in css_paths],
        },
        "summary": {
            "score": score,
            "grade": letter,
            "counts": {
                name: counts.get(name, 0)
                for name in ("critical", "major", "minor", "enhancement")
            },
            "disclaimer": "Static heuristic only; not WCAG conformance or visual proof.",
        },
        "findings": [asdict(item) for item in findings],
    }

    output = (
        json.dumps(report, indent=2, ensure_ascii=False)
        if args.format == "json"
        else render_text(report)
    )
    if args.output:
        Path(args.output).expanduser().resolve().write_text(output + "\n", encoding="utf-8")
    else:
        print(output)

    threshold = FAIL_LEVELS[args.fail_on]
    if threshold < 0:
        return 0
    return int(
        any(SEVERITY_ORDER[item.severity] <= threshold for item in findings)
    )


if __name__ == "__main__":
    raise SystemExit(main())
