# Атрибуция навыков hardening-набора

Все навыки скачаны 2026-11-24 по зафиксированным коммитам и прошли SkillEvaluator перед установкой. Скопированы только `SKILL.md` и указанные Markdown-справки; скрипты, хуки, бинарники и внешние сервисы НЕ копировались.

| Локальный id | Источник | Коммит | Лицензия | Что скопировано | Изменения |
| --- | --- | --- | --- | --- | --- |
| `reviewing-security` | `osmontero/opencode-skills`, `skills/reviewing-security/` | `3478280631435fcb9e2d85c5f053f8e8e64364b8` | MIT (LICENSE в корне) | `SKILL.md`, `references/vulnerability-patterns.md` | нет |
| `memory-leaks` | `triggerdotdev/staff-engineering-skills`, `skills/staff-engineering-skills-memory-leaks/SKILL.md` | `597da099e4b7d07f53946cc393ca24ad9274d925` | Apache-2.0 (LICENSE в корне) | `SKILL.md` | `name:` сокращён до `memory-leaks` под имя папки |
| `backpressure` | `triggerdotdev/staff-engineering-skills`, `skills/staff-engineering-skills-backpressure/SKILL.md` | `597da099e4b7d07f53946cc393ca24ad9274d925` | Apache-2.0 (LICENSE в корне) | `SKILL.md` | `name:` сокращён до `backpressure` под имя папки |
| `race-conditions` | `triggerdotdev/staff-engineering-skills`, `skills/staff-engineering-skills-race-conditions/SKILL.md` | `597da099e4b7d07f53946cc393ca24ad9274d925` | Apache-2.0 (LICENSE в корне) | `SKILL.md` | `name:` сокращён до `race-conditions` под имя папки |
| `error-handling` | `DevelopersGlobal/ai-agent-skills`, `skills/error-handling/SKILL.md` | `b430fd194facf6d3a35cbc49c98410f6e0956d93` | MIT (LICENSE в корне) | `SKILL.md` | нет |
| `observability-instrumentation` | `addyosmani/agent-skills`, `skills/observability-and-instrumentation/` | `e997ac5b9a74eab332d5e9793bb38a38c8cfdd74` | MIT (LICENSE в корне) | `SKILL.md`, `references/shared/observability-checklist.md` | `name:` сокращён до `observability-instrumentation` под имя папки |

## Почему именно эти

- `reviewing-security` — data-flow rule «no finding without an attacker-to-impact path», object-level/tenant authz, SSRF и секреты в клиентском бандле; закрывает P0-находки аудита ai-os-new.
- `backpressure`, `memory-leaks`, `race-conditions` — точечные паттерны для EventBus, кэша, очередей и кросс-таб-логики; не пересекаются с общим `systematic-debugging`.
- `error-handling` — retry/jitter, circuit breaker, degraded state и структурированные ошибки для DLQ, silent errors и unhandled promises.
- `observability-instrumentation` — корреляционные ID, RED/USE, симптомные алерты и runbook; дополняет `session-audit`, который читает уже существующие логи.

## Не взято

- `security-and-hardening` (addyosmani) — частично пересекается с `reviewing-security`; основные примеры лежат в отдельных reference-файлах.
- `security-review` (Sayem7456) и `security-threat-model` (openai) — пересекаются с выбранным security-навыком; openai-вариант ещё и останавливается за подтверждением.
- `secret-hygiene` (sentimony) — совпадает с уже активными `envsitter-guard` и правилами мозга; advisory-only и запускает shell-хелперы.
- `documentation-and-adrs` — пересекается с `brain/decisions/` и `second-brain`.
- `code-simplification` — пересекается с `ponytail-review`.
- performance/a11y/ui-ux/impeccable/Understand-Anything/Graphify — требуют npx/Python/pnpm/бинарников или облачных ключей.
