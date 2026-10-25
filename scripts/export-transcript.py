#!/usr/bin/env python3
"""Export Claude Code session transcripts for this project to Markdown.

    python3 scripts/export-transcript.py            # writes docs/transcripts/

Claude Code stores each session as JSON lines under
``~/.claude/projects/<project path with / replaced by ->/``. This script turns
every session into ``docs/transcripts/<date>-<session id>.md`` containing, in
order:

- every user message, verbatim (including messages sent while the assistant
  was working, and answers given to its multiple-choice questions);
- every assistant reply, verbatim;
- one line per tool call: the tool and what it was for (its own description,
  or the file it touched).

Left out: tool outputs (file contents, command output), the model's private
reasoning, and context the tool injects automatically into messages
(``<system-reminder>`` blocks, which include account details). Nothing is
summarised or reworded.
"""

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SOURCE = Path.home() / ".claude" / "projects" / str(REPO).replace("/", "-")
OUTPUT = REPO / "docs" / "transcripts"

SYSTEM_REMINDER = re.compile(r"<system-reminder>.*?</system-reminder>\s*", re.DOTALL)


def clean(text: str) -> str:
    """Remove automatically injected context; keep everything the user typed."""
    return SYSTEM_REMINDER.sub("", text).strip()


def relative(path: str) -> str:
    return path.replace(str(REPO) + "/", "")


def text_of(content: object) -> str:
    """Plain text of a message's content (a string or a list of blocks)."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(
            block.get("text", "")
            for block in content
            if isinstance(block, dict) and block.get("type") == "text"
        )
    return ""


def describe_tool(name: str, tool_input: dict[str, object]) -> str:
    """One-line description of a tool call, without its (often large) payload."""
    for key in ("description", "file_path", "url", "query", "skill", "action"):
        value = tool_input.get(key)
        if isinstance(value, str) and value:
            return relative(value)
    return ""


def render_session(path: Path) -> tuple[str, str]:
    """Return (output file name, Markdown) for one session file."""
    lines = [json.loads(line) for line in path.open(encoding="utf-8")]
    entries = [entry for entry in lines if not entry.get("isSidechain")]
    started = next((e["timestamp"] for e in entries if e.get("timestamp")), "")
    session_id = path.stem

    out = [
        f"# Claude Code session `{session_id}`",
        "",
        f"Started {started[:16].replace('T', ' ')} UTC. Exported verbatim by",
        "`scripts/export-transcript.py` (tool outputs, private reasoning and",
        "automatically injected context are omitted; see the script's docstring).",
        "",
    ]
    question_ids: set[str] = set()

    for entry in entries:
        kind = entry.get("type")
        message = entry.get("message") or {}
        content = message.get("content")

        if kind == "user" and not entry.get("isMeta"):
            if isinstance(content, list) and any(
                isinstance(b, dict) and b.get("type") == "tool_result" for b in content
            ):
                for block in content:
                    if block.get("type") == "tool_result" and block.get("tool_use_id") in question_ids:
                        answer = clean(text_of(block.get("content")))
                        out += ["**User (answer):**", "", answer, ""]
                continue
            text = clean(text_of(content))
            if text:
                out += ["---", "", "## User", "", text, ""]

        elif kind == "attachment":
            attachment = entry.get("attachment") or {}
            if attachment.get("type") == "queued_command":
                text = clean(text_of(attachment.get("prompt")))
                if text:
                    out += ["---", "", "## User (sent while the assistant was working)", "", text, ""]

        elif kind == "assistant" and isinstance(content, list):
            for block in content:
                if block.get("type") == "text" and block.get("text", "").strip():
                    out += ["**Assistant:**", "", block["text"].strip(), ""]
                elif block.get("type") == "tool_use":
                    name = block.get("name", "tool")
                    tool_input = block.get("input") or {}
                    if name == "AskUserQuestion":
                        question_ids.add(block.get("id"))
                        questions = [q.get("question", "") for q in tool_input.get("questions", [])]
                        out += ["**Assistant asked:**", ""]
                        out += [f"- {question}" for question in questions] + [""]
                    else:
                        detail = describe_tool(name, tool_input)
                        out.append(f"> `{name}`" + (f": {detail}" if detail else ""))
                        out.append("")

    return f"{started[:10]}-{session_id}.md", "\n".join(out).rstrip() + "\n"


def main() -> int:
    sessions = sorted(SOURCE.glob("*.jsonl"))
    if not sessions:
        print(f"No sessions found in {SOURCE}", file=sys.stderr)
        return 1
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for session in sessions:
        name, markdown = render_session(session)
        (OUTPUT / name).write_text(markdown, encoding="utf-8")
        print(f"Wrote {OUTPUT.relative_to(REPO) / name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
