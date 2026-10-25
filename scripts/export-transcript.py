#!/usr/bin/env python3
"""Export Claude Code session transcripts for this project to Markdown.

    python3 scripts/export-transcript.py
    python3 scripts/export-transcript.py --stop-before "text of a user message"

Claude Code stores each session as JSON lines under
``~/.claude/projects/<project path with / replaced by ->/``. This script turns
them into ``docs/transcripts/claude-code-session-transcript.md`` (sessions
after the first get ``-2``, ``-3``, ... suffixes), containing, in order:

- every user message, verbatim (including messages sent while the assistant
  was working, and answers given to its multiple-choice questions);
- every assistant reply, verbatim;
- one line per tool call: the tool and what it was for (its own description,
  or the file it touched).

Left out: tool outputs (file contents, command output), the model's private
reasoning, and context the tool injects automatically into messages
(``<system-reminder>`` blocks, which include account details). Nothing is
summarised or reworded.

``--stop-before TEXT`` ends the export just before the first user message
that starts with TEXT; the header records where the transcript ends.
"""

import argparse
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


def user_text(entry: dict[str, object]) -> str:
    """The typed text of a user entry (a prompt or a mid-turn message), if any."""
    if entry.get("type") == "attachment":
        attachment = entry.get("attachment") or {}
        if isinstance(attachment, dict) and attachment.get("type") == "queued_command":
            return clean(text_of(attachment.get("prompt")))
        return ""
    if entry.get("type") == "user" and not entry.get("isMeta"):
        message = entry.get("message") or {}
        return clean(text_of(message.get("content") if isinstance(message, dict) else None))
    return ""


def render_session(path: Path, stop_before: str | None) -> str:
    """Return the Markdown transcript of one session file."""
    lines = [json.loads(line) for line in path.open(encoding="utf-8")]
    entries = [entry for entry in lines if not entry.get("isSidechain")]
    if stop_before:
        for index, entry in enumerate(entries):
            if user_text(entry).startswith(stop_before):
                entries = entries[:index]
                break
    timestamps = [e["timestamp"] for e in entries if e.get("timestamp")]
    started, ended = (timestamps[0], timestamps[-1]) if timestamps else ("", "")

    out = [
        "# Claude Code session transcript",
        "",
        f"Session `{path.stem}`, {started[:16].replace('T', ' ')} to"
        f" {ended[:16].replace('T', ' ')} UTC.",
        "",
        "Exported verbatim by `scripts/export-transcript.py`: every message from",
        "the user and the assistant, plus one line per tool call. Tool outputs,",
        "private reasoning and automatically injected context are omitted (see the",
        "script's docstring). The prompts alone are also in [PROMPTS.md](../../PROMPTS.md).",
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

    return "\n".join(out).rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument(
        "--stop-before",
        metavar="TEXT",
        help="end the export before the first user message starting with TEXT",
    )
    args = parser.parse_args()

    sessions = sorted(SOURCE.glob("*.jsonl"), key=lambda path: path.stat().st_mtime)
    if not sessions:
        print(f"No sessions found in {SOURCE}", file=sys.stderr)
        return 1
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for number, session in enumerate(sessions, start=1):
        suffix = "" if number == 1 else f"-{number}"
        target = OUTPUT / f"claude-code-session-transcript{suffix}.md"
        target.write_text(render_session(session, args.stop_before), encoding="utf-8")
        print(f"Wrote {target.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
