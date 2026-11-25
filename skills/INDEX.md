# Индекс навыков OpenCode

Составлено 2026-11-25. Локальных навыков: **57**. Дополнительно плагин `hffmnnj.deep-research` регистрирует навык `deep-research` (не лежит в этой папке).

Этот файл — карта, а не копия описаний. Для точного триггера читай `TRIGGERS.md` и `SKILL.md` выбранного навыка.

## 1. Среда, память, администрирование

| Навык | Назначение | Примечание |
| --- | --- | --- |
| `opencode-tuner` | Безопасные изменения `~/.config/opencode`, установка плагинов/навыков/MCP | Основной для конфигурации |
| `md-examples` | Шаблоны AGENTS.md, SKILL.md, команд, агентов, opencode.jsonc | Основной для MD-конфигов |
| `admin-panel` | Вторая админка на `http://127.0.0.1:8787` | Проверка сервиса/плагинов/логов |
| `second-brain` | Запись и поиск фактов в мозг | Использовать по «запомни/сохрани» |
| `obsidian` | Работа с vault через Local REST API | 20 инструментов `tools.obsidian.*` |
| `graph` | Граф проекта/памяти, визуализация связей | `tools.graph.*` |
| `computer-use` | Windows GUI + браузер | Скриншоты, мышь, клавиатура, вкладки |
| `autopilot` | Долгая автономная работа: цель, шаги, чекпоинты | `tools.autopilot.*` |
| `reaudit` | Повторный read-only аудит ai-os-new по 24 проверкам | Сравнение с базовой линией |
| `repo-audit` | Read-only аудит чужого репозитория | Отчёт в `brain/reports/` |
| `session-audit` | Аудит логов сессий OpenCode | Ошибки, циклы, перезапуски CLI |
| `deep-research-lite` | Быстрое многоисточниковое веб-исследование | Один файл, без библиотеки |
| `deep-research` | Серьёзный путь с постоянной библиотекой | Регистрируется плагином, `tools.research.*` |

## 2. Мета-навыки

| Навык | Когда |
| --- | --- |
| `opencode-skill-creation` | Пишем новый навык с нуля по конвенциям V2 |
| `skill-doc-authoring` | Превращаем готовый SOP/процесс в короткий SKILL.md |
| `skill-creator` | Установка/список/удаление/диагностика навыков |

Правило: любой внешний навык — SkillEvaluator + зафиксированный коммит + атрибуция в `skills/`.

## 3. Исследование кода и репозиториев

| Навык | Фокус |
| --- | --- |
| `repository-analysis` | Первый взгляд на неизвестный репозиторий |
| `exploring-code` | Глубокое знакомство с кодовой базой |
| `code-explorer` | Трассировка одной фичи от входа до хранения |
| `analyzing-projects` | Архитектура и слои проекта |
| `codebase-onboarding-check` | Онбординг + проверки понимания с ответами |

Приоритет при выборе: `repository-analysis` → `exploring-code` → `code-explorer` → `analyzing-projects`. `codebase-onboarding-check` — только когда нужно проверить понимание.

## 4. Качество кода и тесты

| Навык | Фокус |
| --- | --- |
| `systematic-debugging` | Любой баг/тест/неожиданное поведение до гипотез о фиксе |
| `test-driven-development` | Новый код/фикс — сначала тест |
| `verification-before-completion` | Перед заявкой «готово/зелено» |
| `property-based-testing` | Свойства, инварианты, round-trip вместо примеров |
| `flaky-test-management` | Нестабильные тесты, карантин, корневые причины |
| `code-reviewer` | Общий code review |
| `receiving-code-review` | Только когда получили ревью и хотим его применить |
| `reviewing-security` | Только безопасность: authz, SSRF, секреты, subprocess |
| `doubt-driven-development` | Адверсариальная проверка перед высокорисковым решением |

`ponytail-review` из плагина — только про избыточную сложность, не про корректность.

## 5. Надёжность, производительность, наблюдаемость

`race-conditions`, `backpressure`, `memory-leaks`, `error-handling`, `observability-instrumentation`, `performance-optimization`, `shipping-and-launch`, `incident-response`.

Это набор для ai-os-new-долгов: гонки, очередности, утечки, тихие ошибки, метрики, релизы и инциденты.

## 6. Агентные паттерны и процессы

`agent-loop-contracts`, `tool-and-mcp-authoring`, `agent-eval-harness`, `ai-agent-evaluation`, `context-window-budgeting`, `durable-agent-workflows`, `dispatching-parallel-agents`, `brainstorming`, `caveman`, `git-commits-prs`, `api-and-interface-design`, `deprecation-and-migration`, `tech-writing`.

`ai-agent-evaluation` — про оценку существующего агента; `agent-eval-harness` — про создание локального воспроизводимого harness.

## 7. Frontend и UI/UX

`react-expert`, `react-best-practices`, `typescript-pro`, `frontend-ui-engineering`, `accessibility-engineering`, `web-design-guidelines`, `vercel-composition-patterns`.

Приоритет: `frontend-ui-engineering` (сборка) → `web-design-guidelines` (ревью) → `accessibility-engineering` (аудит WCAG). React-специфику закрывают `react-expert`/`react-best-practices`/`vercel-composition-patterns`.

## Явно устаревшие/перекрываемые

- Не вызывать одновременно `code-reviewer` + `reviewing-security` + `ponytail-review`: выбрать по задаче.
- Не вызывать `deep-research-lite` и `deep-research` вместе: lite — быстрый путь, plugin — серьёзный путь с библиотекой.
- `caveman` — режим голоса, не рабочий инструмент; включать только по `/caveman`.
