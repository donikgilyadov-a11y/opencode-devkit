---
name: agent-eval-harness
description: Build a local, repeatable evaluation harness for agent workflows with datasets, assertions, baselines and CI gates. Use when you need to prove that an agent change helped rather than relying on a demo.
license: MIT
metadata:
  category: ai
  version: "1.0"
  tags: evaluation, harness, regression, baseline, ci
---

# Agent Eval Harness

Methodology lives in `ai-agent-evaluation`. This skill turns it into a runnable local harness.

## Purpose

- Turn one-off checks into a command anyone can rerun.
- Compare a change against a saved baseline instead of comparing impressions.
- Produce a durable artifact that survives context compression.

## When to use

Use when changing prompts, tools, routing, memory, subagents or context policy and you need evidence of the effect.

Do not use for a single deterministic unit test; use the normal test suite instead.

## Harness layout

Keep four artifacts in the repository or second brain:

| Artifact | Content |
| :--- | :--- |
| `cases.jsonl` | One case per line with id, input, context, expected outcome and must-not rules. |
| `runner.js` | Deterministic runner: fixed seed, fixed model/version, fixed tool mocks. |
| `baseline.json` | Last known good scores and the exact config that produced them. |
| `report.md` | Human-readable diff, failures and recommendation. |

A minimal case:

```json
{"id":"handoff-resume","input":"resume a blocked task","expect":{"status":"resumed"},"must_not":["new write outside workspace"]}
```

## Runner steps

1. Freeze configuration: model, prompt version, tool versions, seed, temperature.
2. Load each case and run it in an isolated workspace or sandbox.
3. Capture the trace: steps, tool calls, arguments, tokens, cost and duration.
4. Assert on observable end state first, then on trajectory and policy.
5. Run each case several times for stochastic systems; record pass rate and variance.
6. Write `report.md` and update `baseline.json` only after explicit review.

## Scoring

Score separately and do not blend blindly:

- **task success** — end state matches expectation;
- **trajectory** — required steps present, no loops or invented tools;
- **policy** — zero violation of must-not rules;
- **quality** — rubric judged by a model different from the agent;
- **efficiency** — tokens, cost and latency within budget.

A regression is any drop in task success, any policy violation, or cost above budget. A wording improvement is not a regression if the assertions still pass.

## Gates

- Pull request: fast subset, roughly 30 cases, short timeout.
- Nightly: full set plus adversarial and long-context cases.
- Release: full set must meet baseline minus an agreed epsilon.
- Every production failure becomes a new case before the fix is merged.

## Local conventions on this machine

- Put scripts in `~/Desktop/opencode-boost/scripts/` and cases under `brain/reports/evals/` or the project being evaluated.
- Never write eval fixtures inside a third-party project that is read-only.
- Save the conclusion with `brain.save(topic, text, long)` and link the report from `MEMORY.md`.
- Use `npm test` for deterministic helpers; use the eval runner only for model-driven behavior.

## Pitfalls

- A demo prompt used as the test set.
- Judge model grading its own output.
- Baseline updated automatically after every failing run.
- No seed or version recorded, so results cannot be reproduced.
- Ignoring cost and latency until production.

## Related

`ai-agent-evaluation`, `llm-testing`, `verification-before-completion`, `tech-writing`, `context-window-budgeting`.
