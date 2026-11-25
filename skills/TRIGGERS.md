# Триггеры навыков — короткий маршрутизатор

Правило: если подходит несколько навыков, бери **первый по приоритету в строке** и не вызывай соседние без явной необходимости. Полные описания — в `SKILL.md`.

| Ситуация / фраза пользователя | Навык | Не вызывать вместо него |
| --- | --- | --- |
| «запомни», «сохрани в мозг», «что мы решали» | `second-brain` | — |
| «найди в памяти/дневнике/решениях» | `second-brain` + `brain.search` | — |
| «граф проекта/памяти», «схема связей» | `graph` | — |
| «посмотри админку», «проверь сервис/плагины/логи» | `admin-panel` | — |
| «сделай конфиг/плагин/навык/команду OpenCode» | `opencode-tuner` | — |
| «напиши AGENTS.md / SKILL.md / команду / агента» | `md-examples` | — |
| «создай навык с нуля» | `opencode-skill-creation` | `skill-doc-authoring` |
| «оформи готовый процесс как SKILL.md» | `skill-doc-authoring` | `opencode-skill-creation` |
| «установи/удали/список навыков» | `skill-creator` | — |
| «долгая автономная задача», «иди до цели» | `autopilot` | встроенный `/goal` — только для одной сессии |
| «перед сжатием контекста» | `context-window-budgeting` → `autopilot.checkpoint` → `compress` | — |
| «второй мозг в Obsidian», «найди заметку vault» | `obsidian` | `second-brain` — только для файлов brain |
| «Windows/GUI/скриншот/браузер» | `computer-use` | — |
| «исследовать тему по нескольким источникам» | `deep-research-lite` (быстро) | `deep-research` — только серьёзный путь |
| «с постоянной библиотекой/цитатами/верификацией» | `deep-research` (плагин) | `deep-research-lite` |
| «аудит чужого репозитория, не меняй его» | `repo-audit` | `repository-analysis` — только первый взгляд |
| «первый взгляд на репозиторий» | `repository-analysis` | `exploring-code` |
| «изучить кодовую базу / онбординг» | `exploring-code` | `repository-analysis` |
| «как работает конкретная фича» | `code-explorer` | `exploring-code` |
| «архитектура/слои/паттерны проекта» | `analyzing-projects` | — |
| «проверь понимание/сделай вопросы по проекту» | `codebase-onboarding-check` | — |
| «ошибка/тест упал/неожиданное поведение» | `systematic-debugging` | сразу предлагать фикс |
| «пиши новый код/фикс» | `test-driven-development` | — |
| «перед тем как сказать «готово/зелено/прогнано» | `verification-before-completion` | — |
| «свойства/инварианты/round-trip» | `property-based-testing` | example-based тесты |
| «тест то проходит, то нет» | `flaky-test-management` | `systematic-debugging` |
| «code review» | `code-reviewer` | `reviewing-security` — только безопасность |
| «безопасно ли это / SSRF / authz / секреты» | `reviewing-security` | `code-reviewer` |
| «получил ревью, как применить» | `receiving-code-review` | `code-reviewer` |
| «упрости/что удалить/избыточная сложность» | `ponytail-review` (плагин) | `code-reviewer` |
| «убедись, что решение не ломается» | `doubt-driven-development` | — |
| «гонки/TOCTOU/read-modify-write» | `race-conditions` | — |
| «очередь растёт/продьюсер быстрее консьюмера» | `backpressure` | — |
| «утечка памяти/слушатели/таймеры/кэш растёт» | `memory-leaks` | — |
| «ошибка/деградация/сообщение об ошибке» | `error-handling` | — |
| «логи/метрики/трейсинг/алерты» | `observability-instrumentation` | — |
| «тормозит/N+1/запросы/кэш» | `performance-optimization` | — |
| «релиз/канареечный запуск/откат» | `shipping-and-launch` | — |
| «инцидент/SEV/постмортем» | `incident-response` | — |
| «миграция/удаление старого API» | `deprecation-and-migration` | — |
| «REST/GraphQL/контракт модуля» | `api-and-interface-design` | — |
| «README/ docs / текст / ADR» | `tech-writing` | — |
| «дизайн/верстка/UI/UX/доступность» | `frontend-ui-engineering` | `web-design-guidelines` — ревью, `accessibility-engineering` — аудит |
| «проверь UI по best practices» | `web-design-guidelines` | — |
| «WCAG/axe/pa11y/скринридер» | `accessibility-engineering` | — |
| «React 19/композиция/компоненты» | `react-expert` + `vercel-composition-patterns` | — |
| «React performance» | `react-best-practices` | `performance-optimization` — общее |
| «сложные типы TS/generics/tRPC» | `typescript-pro` | — |
| «контракт агента/handoff/стоп-условие» | `agent-loop-contracts` | — |
| «инструмент/MCP-схема» | `tool-and-mcp-authoring` | — |
| «оценить агента/ trajectory/pass@k» | `ai-agent-evaluation` | — |
| «сделать eval harness/CI gate» | `agent-eval-harness` | `ai-agent-evaluation` |
| «долгая задача, несколько сессий, рестарт» | `durable-agent-workflows` | `autopilot` — исполнение здесь и сейчас |
| «2+ независимые задачи параллельно» | `dispatching-parallel-agents` | — |
| «идея/фича/архитектура — сначала подумать» | `brainstorming` | — |
| «git commit/PR workflow» | `git-commits-prs` | — |
| «короче/режим пещерного человека» | `caveman` | только по `/caveman` |
| «повторный аудит ai-os-new после фиксов» | `reaudit` | — |
| «аудит логов сессий» | `session-audit` | — |
