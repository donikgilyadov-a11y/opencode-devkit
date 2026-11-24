# Attribution — next 3 skills

All three skills come from one pinned source and keep their original `SKILL.md` content unchanged.

| Skill | Source | Pinned commit | License |
| --- | --- | --- | --- |
| `verification-before-completion` | `obra/superpowers`, `skills/verification-before-completion/SKILL.md` | `22f0b463e7a5e579904dd6211a520321035526f7` | MIT |
| `dispatching-parallel-agents` | `obra/superpowers`, `skills/dispatching-parallel-agents/SKILL.md` | `22f0b463e7a5e579904dd6211a520321035526f7` | MIT |
| `receiving-code-review` | `obra/superpowers`, `skills/receiving-code-review/SKILL.md` | `22f0b463e7a5e579904dd6211a520321035526f7` | MIT |

Upstream: https://github.com/obra/superpowers — MIT, Copyright (c) 2025 Jesse Vincent.

Rationale for the choice: these three close real gaps without overlapping the skills already installed (`systematic-debugging`, `test-driven-development`, `code-reviewer`, `git-commits-prs`, `brainstorming`, `caveman`, `autopilot`):

- `verification-before-completion` — requires fresh command output before any success claim.
- `dispatching-parallel-agents` — disciplined hand-off to independent subagents with isolated context.
- `receiving-code-review` — technical evaluation of review feedback instead of automatic agreement.

Skipped from the same repository: `writing-plans` (depends on sibling superpowers skills), `executing-plans`/`subagent-driven-development`/`autopilot` overlap, `writing-skills` overlaps our meta-skills, `finishing-a-development-branch` overlaps `git-commits-prs`, `diagnosing-superpowers` is meta only.

No source code, scripts, proxies or MCP servers were copied — only the three Markdown skill files.
