# Атрибуция: навыки проверки решений и миграций

Источник: [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills), зафиксированный коммит/tree `e997ac5b9a74eab332d5e9793bb38a38c8cfdd74`. Лицензия MIT (LICENSE в корне репозитория, Copyright 2025 Addy Osmani). Источник и лицензия ранее проверены верификатором в заметке `rn_mwupxxvfg7qx`.

| Навык | Путь в источнике | Что даёт | Почему отобран |
| --- | --- | --- | --- |
| `doubt-driven-development` | `skills/doubt-driven-development/SKILL.md` | CLAIM → EXTRACT → DOUBT → RECONCILE → STOP; свежий адверсариальный ревьюер, проверка артефакта по контракту без подсказки выводом автора | Нужен перед передачей выводов аудита ai-os-new второму агенту и перед любыми высокорисковыми изменениями: помогает отделить доказанное от предположений |
| `deprecation-and-migration` | `skills/deprecation-and-migration/SKILL.md` | Удаление кода как снижение долга, обязательная/рекомендательная депрекация, expand → backfill → contract для схем БД, зомби-код, проверка down-path | Прямо закрывает долги ai-os-new по миграциям схемы (v5→v45), устаревшим функциям и «защитам в коде, не подключённым к прод-путям» |

Дополнительно скопирован файл `references/orchestration-patterns.md` источника в `doubt-driven-development/references/shared/orchestration-patterns.md`: в `SKILL.md` есть ссылка именно на этот относительный путь, а в репозитории файл лежит в `references/`. Упоминаемые в навыке agent-персоны (`agents/`) и кросс-модельные CLI в этой установке не требуются: при отсутствии доступного CLI шаг кросс-модельной проверки пропускается с явным уведомлением, как и prescribed в навыке.

Не ставились: `source-driven-development` (пересекается с навыком `opencode` и постоянной библиотекой deep research: мы уже проверяем официальные V2-доки и цитируем источники), `code-review-and-quality`, `debugging-and-error-recovery`, `test-driven-development`, `git-workflow-and-versioning`, `ci-cd-and-automation`, `documentation-and-adrs`, `constraint-driven-development`, `accessibility-engineering` — дублируют установленные навыки или требуют внешних инструментов и дополнительных файлов.

Имена папок уже совпадают с `name:` во frontmatter, переименований не потребовалось. Скопированы только Markdown-файлы; бинарников, MCP-серверов, ключей и сетевых зависимостей нет.
