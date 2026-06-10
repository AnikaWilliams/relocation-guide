#!/usr/bin/env bash
# Stop hook — nudge to keep FOUNDER-TLDR.md (the plain-English changelog) current.
#
# Behaviour:
#   - Reads the Claude Code Stop-hook JSON from stdin.
#   - Exits 0 immediately if stop_hook_active is true (we are already inside a
#     stop-hook continuation) — this prevents an infinite block/continue loop.
#   - Exits 0 if there are no code changes (src/ or tests/) newer than the last
#     FOUNDER-TLDR.md update, so trivial Q&A turns don't trigger a changelog entry.
#   - Otherwise blocks the stop and asks for a new changelog entry.
#
# No external deps (no jq/node), so it works in the bundled Git Bash.

payload="$(cat 2>/dev/null)"

# 1) Loop guard: if this stop is itself the result of a stop hook, do nothing.
case "$payload" in
  *'"stop_hook_active":true'* | *'"stop_hook_active": true'*) exit 0 ;;
esac

# Work from the repo root.
root="$(git rev-parse --show-toplevel 2>/dev/null)"
[ -n "$root" ] && cd "$root"

tldr="FOUNDER-TLDR.md"

# If the changelog doesn't exist yet, don't block (nothing to compare against).
[ -f "$tldr" ] || exit 0

# 2) Any code files (src/ or tests/) modified more recently than the changelog?
#    If so, there is product work that hasn't been written up yet.
newer="$(find src tests -type f -newer "$tldr" 2>/dev/null | head -n 1)"

if [ -z "$newer" ]; then
  # No code changes since the last changelog update — let the turn end quietly.
  exit 0
fi

# 3) Block the stop and request a founder-friendly changelog entry.
printf '%s\n' '{"decision": "block", "reason": "Before finishing, add a new entry to FOUNDER-TLDR.md following the rules in CLAUDE.md, then summarize the new entry in your response."}'
exit 0
