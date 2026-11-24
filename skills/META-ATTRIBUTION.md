# Атрибуция мета-навыков

Набор из трёх навыков для создания, документации и управления OpenCode-навыками.
Все исходники зафиксированы по коммитам ниже и проверены SkillEvaluator 1.0.1
(`harness-check --harness opencode`: 3/3 load; `validate --tiers 1 --checks schema,quality --min-score 70`: 3/3 pass).

| Навык | Источник | Зафиксированный коммит | Лицензия | Оценка |
| --- | --- | --- | --- | --- |
| `opencode-skill-creation` | `open-hax/opencode-skills`, `.opencode/skills/opencode-skill-creation/SKILL.md` | `d91bad1eda762044c6416d31f93bc7566b530043` | MIT (LICENSE, copyright 2025 OpenHax) | B 89.0 |
| `skill-doc-authoring` | `composio-community/opencode-skills`, `skills/skill-doc-authoring/SKILL.md` | `5076f6673e5bf8b1f46dc5e934d1e3dd37250e10` | MIT (указано в README репозитория; отдельного LICENSE в дереве нет) | B 89.0 |
| `skill-creator` | `JValdivia23/opencode-skill-creator`, `skills/skill-creator/` | `9108f71fff49dd353f76f13044ed28687ea6841a` | MIT (LICENSE, copyright 2026) | B 89.0 |

## Что скопировано

- `opencode-skill-creation/SKILL.md` — один файл. Пути адаптированы под эту машину:
  `~/.config/opencode/skills/<name>/SKILL.md` и `.opencode/skills/<name>/SKILL.md`;
  вместо UNIX `ln -s` указан Windows-эквивалент через `New-Item -ItemType SymbolicLink`.
- `skill-doc-authoring/SKILL.md` — один файл, без изменений.
- `skill-creator/` — `SKILL.md` плюс `references/installation-guide.md`,
  `references/claude-adaptation.md`, `references/troubleshooting.md`,
  `references/templates/basic-skill.md`, `references/templates/full-skill.md`.

Остальное содержимое upstream-репозиториев не копировалось. Никакие зависимости не устанавливались.
Атрибуция сохранена также в DevKit как `skills/META-ATTRIBUTION.md`.
