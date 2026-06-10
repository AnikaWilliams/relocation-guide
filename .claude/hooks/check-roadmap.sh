#!/usr/bin/env bash
# PreToolUse hook (Bash matcher) — enforce that ROADMAP.md is updated alongside
# real progress. If a `git commit` stages files under src/ or tests/ but does not
# also stage ROADMAP.md, the commit is denied with a reminder.
#
# Reads the Claude Code hook JSON on stdin. No external deps (no jq/node) so it
# works in the bundled Git Bash. Only acts on git commit; never blocks anything
# else and never errors out on non-commit commands.
#
# To bypass intentionally: stage a ROADMAP.md update, or temporarily disable the
# hook via the /hooks menu.

payload="$(cat 2>/dev/null)"

# Only act on git commit invocations. The hook payload embeds the command string.
case "$payload" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac

# Be defensive about the working directory.
root="$(git rev-parse --show-toplevel 2>/dev/null)"
[ -n "$root" ] && cd "$root"

staged="$(git diff --cached --name-only 2>/dev/null)"

progress="$(printf '%s\n' "$staged" | grep -E '^(src|tests)/' || true)"
roadmap="$(printf '%s\n' "$staged" | grep -E '(^|/)ROADMAP\.md$' || true)"

if [ -n "$progress" ] && [ -z "$roadmap" ]; then
  reason="Progress detected (src/ or tests/ changed) but ROADMAP.md was not updated. Update ROADMAP.md (status table / phase checklist / corridor coverage) and stage it in this commit so the tracker stays in sync. README.md snapshot should mirror it."
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$reason"
  exit 0
fi

exit 0
