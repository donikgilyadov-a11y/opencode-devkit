# Атрибуция навыков

Источник обоих навыков: [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills), зафиксированный коммит дерева `e997ac5b9a74eab332d5e9793bb38a38c8cfdd74`. Лицензия репозитория — MIT (Copyright 2025 Addy Osmani). Скачаны только Markdown-файлы навыков и справочные файлы, бинарники и скрипты не копировались.

| Навык | Путь в источнике | Что добавлено | Почему выбран |
| --- | --- | --- | --- |
| `performance-optimization` | `skills/performance-optimization/SKILL.md` | `SKILL.md`, `references/optimization-patterns.md`, `references/shared/performance-checklist.md` | Прямо закрывает перформанс-долги ai-os-new: O(n²) пути, отсутствие батчинга, N+1/неограниченная выборка, кэш без ключей, регрессии без измерений. |
| `api-and-interface-design` | `skills/api-and-interface-design/SKILL.md` | `SKILL.md` | Закрывает долг по idempotency/TOCTOU в REST/WS-слое (`sync-server.mjs`): контракт, валидация на границе, идемпотентные ключи, атомарный claim, консистентные ошибки. |

Переименований не потребовалось: `name:` в frontmatter уже совпадает с именами папок.

Не ставились: `accessibility-engineering` (нужны дополнительные справочные файлы и внешние axe/pa11y для реальной проверки), `constraint-driven-development` (интерактивное интервью и установка инструментов проверки в проект), `code-simplification` (пересекается с `ponytail-review`), `documentation-and-adrs` (пересекается с second brain и `brain/decisions/`).

Оба навыка прошли SkillEvaluator v1.0.1: `harness-check --harness opencode` — загрузка, `validate --tiers 1 --checks schema,quality --min-score 70` — успех.
