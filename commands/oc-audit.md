---
description: Аудит конфигурации OpenCode на deprecated-поля и ошибки
agent: oc-admin
---

Проверь конфиг `%USERPROFILE%\.config\opencode\opencode.jsonc` и папки skills/commands/agents/plugins:

1. Есть ли deprecated-поля V1 (`permission`, `tools`, `temperature`, `prompt`, `maxSteps`, `disable`).
2. Есть ли дублирующиеся ID навыков/команд/агентов.
3. Валидный ли JSONC (подсказка: `$schema` = https://opencode.ai/config.json).
4. Что можно улучшить.

Выведи список находок по приоритету. Ничего не меняй без разрешения.
