# Agent ops skills — local authorship notes

These five skills were authored locally on this machine, not downloaded from a third-party repository:

- `agent-loop-contracts`
- `tool-and-mcp-authoring`
- `agent-eval-harness`
- `context-window-budgeting`
- `durable-agent-workflows`

## Source

They distilled the recurring gaps from the user-provided advice folder
`C:\Users\deda donik\Desktop\projects\Новая папка\` (copilot, deepseek, gemini, genspark, grok,
haiku, manus, minimax, mistral, opus5 and qwen notes) after cross-checking the 52 skills already
installed. Advice that duplicated existing skills was intentionally not copied.

## Design decisions

- No binaries, MCP servers, cloud keys or package plugins are required.
- Each skill is a single `SKILL.md` so it can be validated with SkillEvaluator and hot-loaded.
- The skills complement, rather than replace, `ai-agent-evaluation`, `autopilot`, `md-examples`,
  `opencode-skill-creation`, `deep-research` and `verification-before-completion`.
- Content is Markdown only and contains no secrets.
- These are local works; no external license or attribution obligation applies.

## Validation

SkillEvaluator 1.0.1 was run on this staging catalog:

- `harness-check ./skills-agentops-staging --harness opencode -v` — 5/5 load, exit 0, only advisory OC-RELOAD.
- `validate ... --tiers 1 --checks schema,quality -c -r json,markdown -o reports/agentops --min-score 70` — 5/5 pass, exit 0.
- Grades: agent-eval-harness A 93.2, agent-loop-contracts A 93.2, context-window-budgeting A 92.8, durable-agent-workflows A 94.5, tool-and-mcp-authoring A 93.2.
- Stray-character scanner on staging: SUSPECT_LINES=0.
