#!/usr/bin/env bash
# UserPromptSubmit hook: appends every user prompt, verbatim, to PROMPTS.md.
#
# Claude Code pipes the hook payload as JSON on stdin; the raw prompt text is
# in the `.prompt` field. Entries are numbered sequentially and timestamped so
# PROMPTS.md stays an unedited, chronological log of how the AI was steered.
set -euo pipefail

prompts_file="${CLAUDE_PROJECT_DIR:-$(pwd)}/PROMPTS.md"

prompt="$(jq -r '.prompt // empty')"
[[ -z "$prompt" ]] && exit 0

# Next prompt number = number of existing "## Prompt N" headings + 1.
count="$(grep -c '^## Prompt [0-9]' "$prompts_file" 2>/dev/null || true)"
next=$(( ${count:-0} + 1 ))

{
  printf '\n---\n\n## Prompt %d — %s\n\n' "$next" "$(date '+%Y-%m-%d %H:%M:%S %Z')"
  printf '%s\n' "$prompt"
} >> "$prompts_file"
