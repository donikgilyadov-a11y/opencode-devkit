# Атрибуция навыков разбора репозиториев

Навыки скачаны по зафиксированным коммитам 2026-11-24 и проверены SkillEvaluator 1.0.1
(`harness-check --harness opencode`: 4/4 load; `validate --tiers 1 --checks schema,quality --min-score 70`: 4/4 pass).

| Навык | Источник | Зафиксированный коммит | Лицензия | Адаптация |
| --- | --- | --- | --- | --- |
| `repository-analysis` | https://github.com/ZanzyTHEbar/dragonarchy | `dbc382d03da6c32684454ad9dc741df8e54c1aef` | не указана в SKILL.md | без изменений |
| `exploring-code` | https://github.com/tedivm/opencode-config | `f9e659e5b90a7109a5f5c6d6ffb83c0993cd764c` | MIT | добавлен заголовок `# Exploring Code`; `task`/`subagent_type: explore` заменено на `subagent`/`agent: explore`; сохранение отчёта только по запросу в `brain/reports/`, вместо «никогда не сохранять» |
| `analyzing-projects` | https://github.com/CloudAI-X/opencode-workflow | `0128ca6e4014bc14c35791ce33968e92b94e8a1d` | MIT | без изменений |
| `code-explorer` | https://github.com/waybarrios/opencode-power-pack | `c3328ad1633c1561026532f29b718a2380bc52ee` | Apache-2.0 (modified; `UPSTREAMS.json`) | без изменений |
| `code-explorer` (апстрим) | https://github.com/anthropics/claude-plugins-official | `bdca23e8e46f8832d0030c05804ae207786ae37f` | Apache-2.0 | `ported` из `plugins/feature-dev/agents/code-explorer.md`, blob `e0f667ef65f7204399110214defd46ce062a1a51` |

Исходные пути в репозиториях:

- `packages/opencode/.config/opencode/skills/repository-analysis/SKILL.md`
- `skills/exploring-code/SKILL.md`
- `skills/analyzing-projects/SKILL.md`
- `skills/code-explorer/SKILL.md`

Оценки SkillEvaluator: `analyzing-projects` A 90.2, `exploring-code` A 90.8,
`repository-analysis` B 89.8, `code-explorer` B 88.5. Остальные замечания носят стилистический
характер (заголовки `## Purpose`, `## Examples`, метаданные, Windows-пути) и на прохождение не влияют.

Страница skillsmp для `repository-analysis` отдаёт 403, поэтому источник проверен через GitHub API.
Проектные репозитории (`egilyad/ai-os-new`, `donikgilyadov-a11y/evgenyos`) не затрагивались — только чтение чужих репо по явному запросу.
