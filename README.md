# OpenCode DevKit

Набор расширений для **OpenCode V2** на Windows: второй мозг, навыки, команды, агенты, собственные плагины, вторая админка, графы, тесты и мост с Obsidian.

Репозиторий — только код и шаблоны. Он **не содержит** личную память, ключи, токены, файлы `service*.json` и сторонние плагины Obsidian.

## Состав

| Папка | Что внутри |
| --- | --- |
| `plugins/` | 6 локальных плагинов OpenCode: `brain-tools`, `graph-tools`, `autopilot-tools`, `computer-tools`, `audit-tools`, `session-audit-tools` |
| `skills/` | 31 навык: `second-brain`, `opencode-tuner`, `md-examples`, `admin-panel`, `graph`, `autopilot`, `computer-use`, `repo-audit`, `obsidian`, `session-audit`, `react-expert`, `typescript-pro`, `react-best-practices`, `deep-research-lite`, `repository-analysis`, `exploring-code`, `analyzing-projects`, `code-explorer`, `opencode-skill-creation`, `skill-doc-authoring`, `skill-creator`, `reaudit`, `systematic-debugging`, `test-driven-development`, `git-commits-prs`, `code-reviewer`, `brainstorming`, `caveman`, `verification-before-completion`, `dispatching-parallel-agents`, `receiving-code-review` |
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
