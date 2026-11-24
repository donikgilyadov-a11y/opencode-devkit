# OpenCode DevKit

Набор расширений для **OpenCode V2** на Windows: второй мозг, навыки, команды, агенты, собственные плагины, вторая админка, графы, тесты и мост с Obsidian.

Репозиторий — только код и шаблоны. Он **не содержит** личную память, ключи, токены, файлы `service*.json` и сторонние плагины Obsidian.

## Состав

| Папка | Что внутри |
| --- | --- |
| `plugins/` | 6 локальных плагинов OpenCode: `brain-tools`, `graph-tools`, `autopilot-tools`, `computer-tools`, `audit-tools`, `session-audit-tools` |
| `skills/` | 52 навыка: `second-brain`, `opencode-tuner`, `md-examples`, `admin-panel`, `graph`, `autopilot`, `computer-use`, `repo-audit`, `obsidian`, `session-audit`, `react-expert`, `typescript-pro`, `react-best-practices`, `deep-research-lite`, `repository-analysis`, `exploring-code`, `analyzing-projects`, `code-explorer`, `opencode-skill-creation`, `skill-doc-authoring`, `skill-creator`, `reaudit`, `systematic-debugging`, `test-driven-development`, `git-commits-prs`, `code-reviewer`, `brainstorming`, `caveman`, `verification-before-completion`, `dispatching-parallel-agents`, `receiving-code-review`, `reviewing-security`, `memory-leaks`, `backpressure`, `race-conditions`, `error-handling`, `observability-instrumentation`, `performance-optimization`, `api-and-interface-design`, `doubt-driven-development`, `deprecation-and-migration`, `frontend-ui-engineering`, `accessibility-engineering`, `web-design-guidelines`, `vercel-composition-patterns`, `ai-agent-evaluation`, `flaky-test-management`, `property-based-testing`, `shipping-and-launch`, `incident-response`, `codebase-onboarding-check`, `tech-writing` |
| `commands/` | 14 глобальных команд (`/brain`, `/oc-check`, `/oc-doctor`, `/repo-audit`, `/session-audit`, `/reaudit`, …) |
| `agents/` | 2 подагента: `brain-keeper`, `oc-admin` |
| `admin/` | Вторая админка на `http://127.0.0.1:8787` (дашборд, логи, безопасность, графы, проверки) |
| `scripts/` | CLI второго мозга, графов, аудита репозиториев и сессий, самопроверки, дым-теста, Obsidian-прокси и watchdog |
| `config-examples/` | Примеры `opencode.jsonc`, `cli.json`, настроек уведомлений, DCP, ponytail и глобальных инструкций |
| `brain-template/` | Пустая структура второго мозга |

## Быстрый старт

```powershell
git clone https://github.com/donikgilyadov-a11y/opencode-devkit.git
cd opencode-devkit
.\install.ps1
```

Установщик:
- копирует плагины/команды/агентов в `~/.config/opencode/`, а навыки, скрипты, админку и заготовку мозга — в `~/Desktop/opencode-boost/`;
- делает резервную копию каждого перезаписываемого файла и основного конфига;
- объединяет пример конфига с текущим `opencode.jsonc`, сохраняя чужие настройки;
- подставляет домашнюю папку вместо `%USERPROFILE%` и `<HOME>`.

Ключ `-NoConfig` отключает правку конфига. Пути можно переопределить: `-Boost`, `-Config`.

Подробности — [INSTALL.md](INSTALL.md).

## Пакетные плагины

Следующие плагины ставятся отдельно через CLI OpenCode (версии можно зафиксировать):

```powershell
opencode plugin add @tarquinen/opencode-dcp@latest
opencode plugin add @mohak34/opencode-notifier@latest
opencode plugin add opencode-auto-resume@latest
opencode plugin add cc-safety-net@latest
opencode plugin add envsitter-guard@latest
opencode plugin add @slkiser/opencode-quota@latest
opencode plugin add opencode-v2-ponytail-scoped@latest
```

## Проверка после установки

```powershell
& 'C:\Program Files\nodejs\npm.cmd' test        # 29 юнит-тестов
& 'C:\Program Files\nodejs\npm.cmd' run smoke      # 8 проверок админки (нужен запущенный сервер)
& 'C:\Program Files\nodejs\npm.cmd' run smoke:ci   # 6 проверок + 2 SKIP, сервер поднимается сам
node scripts\oc-check.js --json                 # самопроверка сборки (20 проверок)
```

## Авто-врач

`scripts/oc-doctor.js` показывает план и применяет типовые фиксы. По умолчанию только план:

```powershell
node scripts\oc-doctor.js --json                 # что можно починить
node scripts\oc-doctor.js --apply --json         # применить с бэкапами
node scripts\oc-doctor.js --apply --json --service  # ещё и перезапустить сервис
```

В OpenCode для этого есть команды `/oc-doctor` (план, только чтение) и `/oc-doctor-fix` (применение). Ручные пункты (битые ссылки вики, посторонние символы, выключенный Obsidian) не трогаются автоматически — врач только показывает их. Бэкапы складываются в `brain/reports/doctor-backups/<время>/`.

## Аудит сессий

`scripts/session-audit.js` и плагин `session-audit-tools` читают `opencode.log` и находят повторяющиеся ошибки,
всплески (5+ одинаковых событий за 2 минуты) и перезапуски CLI. Отчёт с фиксами и тестами сохраняется в
`brain/reports/session-audit-YYYY-MM-DD.md`; токены и домашний путь в отчёте заменяются заглушками.

```powershell
node scripts\session-audit.js --hours 168            # сводка
node scripts\session-audit.js --all --save --json    # полный отчёт в мозг
```

В OpenCode: `/session-audit`, инструменты `sessionaudit.scan`, `sessionaudit.patterns`, `sessionaudit.report`.
Плагин ничего не меняет в логах и не применяет фиксы автоматически.

## Проверка навыков (SkillEvaluator)

Навыки можно прогонять через [NVIDIA SkillEvaluator](https://github.com/NVIDIA/SkillEvaluator) — он проверяет схему, качество и совместимость с OpenCode:

```powershell
uv tool install --python 3.13 skillevaluator==1.0.1
skillevaluator harness-check ./skills --harness opencode -v
skillevaluator validate ./skills --profile default --tiers 1 --checks schema,quality -c -r json,markdown -o reports --min-score 70
```

Если `skillevaluator` не находится в PATH, используйте `%USERPROFILE%\.local\bin\skillevaluator.exe` или `uv tool update-shell`. Workflow `.github/workflows/skills.yml` запускает тот же гейт при изменении `skills/**`; `harness-check` — информационный, `validate` — блокирующий.

## Фронтенд-навыки

Три внешних навыка для связки TypeScript + React прошли тот же гейт: `react-expert`, `typescript-pro`, `react-best-practices`. Проверка совместимости: `harness-check` — 3/3 загружаются, `validate --tiers 1 --checks schema,quality --min-score 70` — 3/3 прошли, оценки A (90.8–92.0). Повторная проверка всех 13 навыков DevKit тоже прошла: 13/13.

Источники, зафиксированные коммиты и лицензии (все MIT) перечислены в `skills/FRONTEND-ATTRIBUTION.md`. Навыки оставлены без изменений, кроме проверки совместимости с OpenCode V2.

## Глубокое исследование

Два варианта проверены и установлены:

- `deep-research-lite` — лёгкий навык из `FMATheNomad/deep-research-skill` (MIT). Один файл, использует встроенные `websearch`/`webfetch`, параллельную загрузку страниц и структурированный отчёт. В DevKit лежит в `skills/`.
- `hffmnnj.deep-research@latest` — пакетный плагин V2 (MIT) с постоянной библиотекой исследований, инструментами `tools.research.*` (только Code Mode) и тремя подагентами `deep-research/researcher|verifier|librarian`. Библиотека хранится в `~/.local/share/opencode-deep-research/library/`. Плагин сам регистрирует навык `deep-research`, поэтому файл из его репозитория в `skills/` не копировался.

Оба кандидата прошли SkillEvaluator: `harness-check` — 2/2 загружаются, `validate --tiers 1 --checks schema,quality --min-score 70` — 2/2 прошли (оценки A 92.0 и B 86.0). Источники и зафиксированные коммиты — в `skills/DEEP-RESEARCH-ATTRIBUTION.md`. Плагин добавляется в конфиг через `opencode plugin add hffmnnj.deep-research@latest`; обновлённый пример есть в `config-examples/opencode.jsonc.example`.

## Анализ чужих репозиториев

Четыре внешних навыка для чтения и понимания кодовой базы (без её изменения):

- `repository-analysis` — быстрый отчёт «первого взгляда»: обзор, архитектура, структура, ключевые компоненты, тесты и риски.
- `exploring-code` — тщательный онбординг через субагента `explore`: документация → структура → тесты → исходники → интеграции. Адаптирован под наш харнесс (`subagent`/`agent: explore`, отчёт в `brain/reports/` только по просьбе).
- `analyzing-projects` — пятислойный разбор: поверхностный скан, зависимости, архитектура, трассировка потоков, качество.
- `code-explorer` — детальное объяснение конкретной фичи: пути выполнения, слои, абстракции, границы доверенных данных и цитаты `file:line`.

До установки все четыре прошли SkillEvaluator: `harness-check` — 4/4 загружаются, `validate --tiers 1 --checks schema,quality --min-score 70` — 4/4 прошли (оценки 88.5–90.8). Источники, зафиксированные коммиты, лицензии и адаптации — в `skills/REPO-ANALYSIS-ATTRIBUTION.md`. Навыки дополняют `repo-audit` и не изменяют проверяемый репозиторий.

## Мета-навыки

Три внешних навыка для создания, документирования и управления файлами навыков тоже прошли гейт:
`opencode-skill-creation` (создание по V2-конвенциям), `skill-doc-authoring` (короткий
`SKILL.md` из SOP и надёжное описание-триггер), `skill-creator` (установка, список,
обновление, удаление и диагностика загрузки). SkillEvaluator: `harness-check` — 3/3
загружаются, `validate --tiers 1 --checks schema,quality --min-score 70` — 3/3 прошли,
оценки B 89.0. Источники MIT зафиксированы по коммитам, атрибуция — в
`skills/META-ATTRIBUTION.md`. В `opencode-skill-creation` пути адаптированы под
`~/.config/opencode/skills` и Windows (`New-Item -ItemType SymbolicLink` вместо `ln -s`).

## Стартовый набор навыков

Шесть внешних навыков для ежедневной разработки прошли тот же гейт SkillEvaluator:
`systematic-debugging`, `test-driven-development`, `git-commits-prs`, `code-reviewer`,
`brainstorming`, `caveman`. `harness-check` — 6/6 загружаются, `validate --tiers 1
--checks schema,quality --min-score 70` — 6/6 прошли (оценки 86.2–92.8). В
`code-reviewer` добавлен заголовок верхнего уровня, а в `git-commits-prs` убран литерал
`$ARGUMENTS`. Источники, зафиксированные коммиты и лицензии (MIT и Apache-2.0) — в
`skills/STARTER6-ATTRIBUTION.md`.

## Три навыка процесса

Следующие три навыка из `obra/superpowers` (MIT, коммит `22f0b463e7a5e579904dd6211a520321035526f7`) добирают недостающие этапы рабочего цикла: `verification-before-completion` (доказательства до любого «готово»), `dispatching-parallel-agents` (изолированные задачи для параллельных субагентов) и `receiving-code-review` (техническая оценка ревью вместо слепого согласия). SkillEvaluator: `harness-check` 3/3, `validate` 3/3 (A 91.5 / B 87.8 / A 90.2). Атрибуция — `skills/NEXT3-ATTRIBUTION.md`. Остальные навыки superpowers не ставились: они дублируют уже установленные или зависят от sibling-навыков.

## Навыки укрепления кода

Шесть навыков подобраны под долги ai-os-new из отчётов аудита: `reviewing-security` (безопасность с проверкой пути от атакующего к последствию), `memory-leaks`, `backpressure`, `race-conditions`, `error-handling` и `observability-instrumentation`. Источники зафиксированы по коммитам: osmontero/opencode-skills `3478280631435fcb9e2d85c5f053f8e8e64364b8` (MIT), triggerdotdev/staff-engineering-skills `597da099e4b7d07f53946cc393ca24ad9274d925` (Apache-2.0), DevelopersGlobal/ai-agent-skills `b430fd194facf6d3a35cbc49c98410f6e0956d93` (MIT), addyosmani/agent-skills `e997ac5b9a74eab332d5e9793bb38a38c8cfdd74` (MIT). SkillEvaluator: `harness-check` 6/6, `validate --tiers 1 --checks schema,quality --min-score 70` 6/6 (оценки 85.2–90.2); в `error-handling` добавлен верхний заголовок, имена папок приведены к kebab-case. Атрибуция — `skills/HARDENING-ATTRIBUTION.md`. Навыки security-review, threat-model, secret-hygiene, zod-schema и каталоги с внешними рантаймами не ставились: дублируют установленные или требуют неподходящих зависимостей.

## Производительность и API

Два следующих навыка из того же зафиксированного MIT-источника `addyosmani/agent-skills` (`e997ac5b9a74eab332d5e9793bb38a38c8cfdd74`): `performance-optimization` (измерения до оптимизации, N+1, пакетные запросы, кэш-ключи, O(n²)) и `api-and-interface-design` (контракты, валидация на границе, идемпотентность, TOCTOU, единообразные ошибки). Оба выбраны под конкретные долги аудита ai-os-new и не пересекаются с уже установленными навыками. SkillEvaluator: `harness-check` 2/2 load, `validate --tiers 1 --checks schema,quality --min-score 70` 2/2 pass (A 90.2 / A 90.2); в `api-and-interface-design` заменён price-like токен `$50` на `USD 50`. Атрибуция — `skills/PERF-API-ATTRIBUTION.md`. Тогда же пропущены `constraint-driven-development`, `code-simplification` и `documentation-and-adrs`: требуют дополнительных зависимостей или дублируют установленные навыки. `accessibility-engineering` позже установлен в блоке UI/UX ниже.

## Сомнение и миграции

Следующая пара из того же зафиксированного MIT-источника `addyosmani/agent-skills` (`e997ac5b9a74eab332d5e9793bb38a38c8cfdd74`): `doubt-driven-development` (адверсариальная проверка неочевидных выводов в свежем контексте перед передачей дальше) и `deprecation-and-migration` (expand/contract миграции схем, устаревшие API и мёртвый код). Оба выбраны под долги ai-os-new: расхождения в отчётах и миграции v5→v45. SkillEvaluator: `harness-check` 2/2 load, `validate --tiers 1 --checks schema,quality --min-score 70` 2/2 pass (A 90.2 / A 90.2). Атрибуция — `skills/DOUBT-MIGRATION-ATTRIBUTION.md`. Пропущены `source-driven-development` и прочие навыки с пересечениями или лишними зависимостями.

## Дизайн, вёрстка и UI/UX

Четыре навыка закрывают запрос на дизайн, вёрстку и usability: `frontend-ui-engineering` (композиция, токены, адаптивность 320/768/1024/1440, состояния загрузки/ошибки, WCAG 2.1 AA), `accessibility-engineering` (аудит WCAG 2.2 AA, ручная проверка клавиатуры и скринридера; внешние `npx`-утилиты только описаны, не запускались), `web-design-guidelines` (100+ правил Vercel по фокусу, формам, типографике, изображениям, анимации, тёмной теме, touch и i18n) и `vercel-composition-patterns` (composite-паттерны React, явные варианты, state-context interface, особенности React 19). Источники зафиксированы: addyosmani/agent-skills `e997ac5b9a74eab332d5e9793bb38a38c8cfdd74` и vercel-labs/agent-skills `5a37a6329fbad3666c3207392a6a7c0110e92efb`, оба MIT. SkillEvaluator: `harness-check` 4/4, `validate --tiers 1 --checks schema,quality --min-score 70` 4/4 (A 90.2, B 89.5, B 83.2, B 83.0); исправлены литерал `$ARGUMENTS` и XML-подобный `argument-hint` в `web-design-guidelines`. Атрибуция — `skills/UI-DESIGN-ATTRIBUTION.md`. Не ставились `impeccable` (бинарный движок, хуки, телеметрия, запись в проект) и `ui-ux-pro-max` (Python 3 и большие CSV-каталоги).

## Новая волна навыков

Семь навыков отобраны глубоким исследованием и тремя независимыми верификаторами по принципу «не дублировать уже установленные»: `ai-agent-evaluation` и `flaky-test-management` и `property-based-testing` для тестов, `shipping-and-launch` и `incident-response` для релизов и инцидентов, `codebase-onboarding-check` для проверки понимания кода, `tech-writing` для документации. Источники зафиксированы: `mejbaurbahar/software-tester-skills` `e3ee5dba8ca7cc1aef7bd4ed38e60b374b831002` (MIT), `addyosmani/agent-skills` `e997ac5b9a74eab332d5e9793bb38a38c8cfdd74` (MIT), `anthropics/knowledge-work-plugins` `5e504ae11498f2b8daa30d86b7dab97b2ecd8092` (Apache-2.0), `Agent-Hellboy/codebase-onboarding-check` `0eb510880dc39324c4bc575a289a45ed9b9b3c46` (MIT), `peizh/tech-writing` `130108dfc9f640727a3b70e0d6ee730fa5a32ff6` (MIT). SkillEvaluator: `harness-check` 7/7 load, `validate --tiers 1 --checks schema,quality --min-score 70` 7/7 pass (ai-agent-evaluation A 92.0, flaky-test-management A 92.0, property-based-testing A 92.0, shipping-and-launch A 90.2, incident-response B 84.8, codebase-onboarding-check B 89.0, tech-writing B 87.2). Адаптации: у `incident-response` убраны `argument-hint`, ссылка на `CONNECTORS.md` и литерал `$ARGUMENTS`; у `tech-writing` не скопирован китайский справочник и вычищены упоминания о нём. Атрибуция — `skills/NEXTWAVE-ATTRIBUTION.md`. Не ставились `prompt-eval-and-regression` (NOASSERTION), `deploy-checklist` (подмножество shipping), `postmortem-writing`/`sre-runbook-author` (пересечения) и навыки с облачными CLI/скриптами.

## Повторный аудит

`scripts/reaudit.js`, навык `reaudit`, команда `/reaudit` и npm-скрипт `reaudit` нужны, чтобы
после исправлений на другом ПК прогнать те же 24 проверки и сравнить с базовой линией:

```powershell
node scripts\reaudit.js "<папка с проектом>" --name ai-os-new
```

Скрипт только читает файлы; отчёт и diff сохраняются в `brain/reports/`. Подробности — в
вики `wiki/reaudit.md`.

## CI/CD и релизы

- `.github/workflows/ci.yml` — `npm test` и `npm run smoke:ci` на Node 22 (Ubuntu), без `npm install`/`npm ci`: в репозитории нет lockfile, а `install.js` — пользовательский скрипт, который в CI запускать нельзя.
- `.github/workflows/skills.yml` — гейт SkillEvaluator при изменении `skills/**`.
- `.github/workflows/release.yml` — ручной релиз через `workflow_dispatch`: проверяет semver, обновляет `VERSION` и `CHANGELOG.md`, создаёт тег `vX.Y.Z`, архив и GitHub Release. Есть режим `dry_run`.
- `.github/dependabot.yml` — ежемесячные обновления GitHub Actions и будущих npm-зависимостей одной группой PR.
- `.github/workflows/actions.lock` не используется: экшены закреплены по SHA с комментариями версий.

Локальная проверка перед пушем:

```powershell
npx.cmd --yes github-actionlint .github\workflows\*.yml
node scripts\release.js prepare 1.1.0 --dry-run
```

Smoke в CI поднимает `admin/server.js` с тестовыми фикстурами на отдельном порту и пропускает `/api/data` и `/api/oc-check`, которым нужны OpenCode CLI и сервис на `:28894`. Локальный `npm run smoke` по-прежнему проверяет все 8 эндпоинтов работающей админки.

## Безопасность

- Секреты не хранятся в репозитории: ключ Obsidian-прокси читается из `data.json` плагина в vault, в конфиге OpenCode только `http://127.0.0.1:27125/mcp/`.
- `cc-safety-net` блокирует опасные shell-команды и доступ к `.env`/SSH; `envsitter-guard` даёт безопасные `envsitter_*` инструменты без вывода значений. Не обходите эти блокировки.
- `opencode-v2-ponytail-scoped` по умолчанию выключен.
- Аудит сторонних репозиториев — только для чтения.

Документация с примерами и историей решений: [opencode-wiki](https://github.com/donikgilyadov-a11y/opencode-wiki).
