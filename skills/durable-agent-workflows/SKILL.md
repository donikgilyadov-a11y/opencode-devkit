---
name: durable-agent-workflows
description: Run multi-session agent work with durable state, checkpoints, idempotent steps and crash recovery. Use when a task spans more than one session or must resume after a stop.
license: MIT
metadata:
  category: ai
  version: "1.0"
  tags: workflows, checkpoint, resume, idempotency, autonomy
---

# Durable Agent Workflows

A workflow is durable when a fresh session can continue it from files alone.

## Purpose

- Survive context compression, restarts and cancelled tool calls.
- Make every step repeatable without duplicating side effects.
- Leave an audit trail of what happened and why.

## When to use

Use when:

- the task will take many steps or several sessions;
- steps write files, create commits or call paid APIs;
- the user may stop and resume the work later;
- a failure must not silently discard completed work.

## State layout

Keep one small state directory, for example `brain/autonomy/` or a project `state/` folder:

| File | Content |
| :--- | :--- |
| `GOAL.json` | Goal, stop conditions, budget, allowed actions. |
| `PROGRESS.md` | Append-only log of steps with status and artifact paths. |
| `CHECKPOINTS.md` | Named snapshots before risky or long operations. |
| `artifacts/` | Reports, diffs and generated files referenced from the log. |

Write state before the action it describes. An action that is not recorded cannot be safely resumed.

## Step contract

Each step records:

```json
{
  "id": "step-07",
  "action": "validate migrated config",
  "status": "pending | done | blocked",
  "idempotency_key": "step-07-v1",
  "artifacts": ["path-to-report"],
  "verified_by": "command or observable condition",
  "next": "step-08"
}
```

Rules:

- `status: done` requires `verified_by` to have succeeded.
- Retrying a step with the same key must not repeat its side effect.
- A blocked step records the blocker and the exact decision needed.
- Never delete history; append a correction instead.

## Resume protocol

1. Read goal, stop conditions and the last few progress lines.
2. Identify the first step that is not `done`.
3. Verify its precondition from disk or API, not from memory.
4. Re-run it if it is idempotent; otherwise escalate.
5. Continue until a stop condition is reached.

## Crash and cancellation

- Write partial artifacts to a temporary name and rename on success.
- Use backups before overwriting user configuration.
- Record a cancellation as a state transition, not as a lost step.
- On service restart, re-check health and tool availability before continuing.
- Paid or irreversible operations require an explicit confirmation boundary.

## Stop conditions

Stop successfully only when the observable `stop_when` holds. Stop early on budget exhaustion, repeated identical failure, denied permission, contradiction between sources or user request. Write the final outcome, artifacts and remaining work before stopping.

## Pitfalls

- Progress stored only in chat.
- A step marked done because it was started.
- Re-running a non-idempotent action after a crash.
- Overwriting the previous checkpoint instead of adding a new one.
- Resuming from memory instead of reading state.

## Related

`agent-loop-contracts`, `context-window-budgeting`, `autopilot`, `agent-eval-harness`, `brain-digest` command.
