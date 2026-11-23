---
name: md-examples
description: Готовые рабочие шаблоны Markdown для OpenCode — AGENTS.md, SKILL.md, команды, агенты, opencode.jsonc. Использовать, когда нужно создать или проверить MD-конфиг OpenCode.
---

# MD Examples

Живые примеры лежат в `%USERPROFILE%\Desktop\opencode-boost\md-examples\`.
Дополнительные шаблоны — в `references/PATTERNS.md`.

## Быстрая шпаргалка

| Файл | Куда положить | ID/имя |
| --- | --- | --- |
| `AGENTS.md` | корень проекта | инструкции проекта |
| `SKILL.md` | `.opencode/skills/<id>/SKILL.md` | `<id>` из папки |
| `review.md` | `.opencode/commands/review.md` | `/review` |
| `reviewer.md` | `.opencode/agents/reviewer.md` | агент `reviewer` |
| `opencode.jsonc` | корень проекта или `~/.config/opencode/` | конфиг |

## Мини-шаблоны

Навык:

```markdown
---
name: Имя
description: Когда использовать
---

## Шаги
1. ...
```

Команда:

```markdown
---
description: Что делает
agent: general
---

Сделай то, что просит пользователь.
```

Агент:

```markdown
---
description: Что делает
mode: subagent
permissions:
  - action: edit
    resource: "*"
    effect: deny
---

Ты проверяешь код. Не меняй файлы.
```

Перед использованием скопируйте нужный файл из `md-examples/` и адаптируйте его под задачу.
