# Установка OpenCode DevKit

## Требования

- Windows 10/11, PowerShell.
- OpenCode **V2** (проверено на 2.3.2). CLI желательно доступен как `opencode`.
- Node.js 18+ (проверено на 24). В PowerShell может быть заблокирован `npm.ps1` — используйте `C:\Program Files\nodejs\npm.cmd`.
- Для Obsidian-части: Obsidian Desktop 1.13.1+ и community-плагин `obsidian-local-rest-api` (ставится отдельно).

## Установка

```powershell
git clone https://github.com/donikgilyadov-a11y/opencode-devkit.git
cd opencode-devkit
.\install.ps1
```

Что делает `install.ps1` → `install.js`:

1. Копирует `plugins/`, `commands/`, `agents/` в `%USERPROFILE%\.config\opencode\`.
2. Копирует `skills/`, `scripts/`, `admin/`, `brain-template/` в `%USERPROFILE%\Desktop\opencode-boost\` (папка brain создаётся из шаблона, если её ещё нет).
3. Копирует `INSTRUCTIONS.md.example` в `opencode-boost/INSTRUCTIONS.md`.
4. Снимает резервную копию каждого существующего файла с суффиксом `.bak-<дата>`.
5. Читает текущий `~/.config/opencode/opencode.jsonc`, объединяет его с примером (массивы `instructions`, `skills`, `plugins` — объединением без дублей; `references`, `mcp.servers`, `permissions` — точечно), сохраняет резервную копию и записывает результат.
6. Копирует недостающие файлы настроек из `config-examples/` (`cli.json`, `opencode-notifier.json`, `ponytail-scoped.json`, `dcp.jsonc`) — только если их ещё нет.

> Конфиг перезаписывается в «красивом» JSON без комментариев, но со всеми прежними значениями. Резервная копия с комментариями остаётся рядом. Если вы не хотите трогать конфиг — используйте `.\install.ps1 -NoConfig` и внесите нужные поля вручную.

Другие пути:

```powershell
.\install.ps1 -Boost 'D:\Tools\opencode-boost' -Config "$env:USERPROFILE\.config\opencode"
```

Перезапускать сервис OpenCode не нужно: конфиг и расширения подхватываются автоматически. Если что-то не подхватилось — `/reload` в сессии.

Для разбора логов сессий используйте `/session-audit` (или `node scripts\session-audit.js --hours 168`): он покажет повторяющиеся ошибки, всплески и перезапуски CLI, а отчёт с рекомендациями сохранит через `--save` в `brain/reports/`.

Для чтения чужой кодовой базы доступны навыки `repository-analysis`, `exploring-code`, `analyzing-projects` и `code-explorer` — они только анализируют и не меняют репозиторий. Источники и атрибуция — в `skills/REPO-ANALYSIS-ATTRIBUTION.md`.

Для работы с самими навыками есть `opencode-skill-creation`, `skill-doc-authoring` и `skill-creator`: создание по V2-конвенциям, короткая документация с хорошим триггером и управление установленными навыками. Все три прошли SkillEvaluator; происхождение и лицензии — в `skills/META-ATTRIBUTION.md`.

Стартовый набор `systematic-debugging`, `test-driven-development`, `git-commits-prs`, `code-reviewer`, `brainstorming` и `caveman` тоже проверен SkillEvaluator (6/6). Он закрывает базовый цикл разработки: отладка, тесты перед кодом, коммиты/PR, ревью, мозговой штурм и краткий стиль ответа. Атрибуция — в `skills/STARTER6-ATTRIBUTION.md`.

## После установки

```powershell
opencode plugin add @tarquinen/opencode-dcp@latest
opencode plugin add @mohak34/opencode-notifier@latest
opencode plugin add opencode-auto-resume@latest
opencode plugin add cc-safety-net@latest
opencode plugin add envsitter-guard@latest
opencode plugin add @slkiser/opencode-quota@latest
opencode plugin add opencode-v2-ponytail-scoped@latest
```

Старт админки:

```powershell
Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' `
  -ArgumentList 'admin/server.js' `
  -WorkingDirectory "$env:USERPROFILE\Desktop\opencode-boost" `
  -WindowStyle Hidden -PassThru
```

Откройте `http://127.0.0.1:8787`.

## Obsidian (опционально)

1. Откройте `%USERPROFILE%\Desktop\opencode-boost\brain` как vault Obsidian.
2. Установите community-плагин `obsidian-local-rest-api` (5.5.2), включите HTTP-порт 27123 в его настройках и снимите Restricted mode.
3. Запустите прокси: `node scripts\obsidian-mcp-proxy.js` — он слушает 27125 и подставляет ключ из `data.json`, поэтому секрета нет в конфиге OpenCode.
4. Для автозапуска используйте `scripts\obsidian-proxy-watchdog.js` и ярлык в `shell:Startup`.
5. Проверьте: в OpenCode должны появиться инструменты `obsidian.*`.

## Проверки

```powershell
& 'C:\Program Files\nodejs\npm.cmd' test
& 'C:\Program Files\nodejs\npm.cmd' run smoke      # локальная админка должна быть запущена
& 'C:\Program Files\nodejs\npm.cmd' run smoke:ci   # CI-режим: сервер и фикстуры поднимаются сами
node scripts\oc-check.js --json
node scripts\oc-doctor.js --json          # план авто-врача, ничего не меняет
node scripts\oc-doctor.js --apply --json  # применить фиксы с бэкапами
node scripts\reaudit.js "<папка с проектом>" --name ai-os-new  # read-only сравнение с базой
```

В GitHub Actions те же проверки запускают `.github/workflows/ci.yml` (`npm test` + `npm run smoke:ci`) и `.github/workflows/skills.yml`. Релиз создаётся вручную через `.github/workflows/release.yml`: он обновит `VERSION`/`CHANGELOG.md`, поставит тег `vX.Y.Z` и опубликует архив.

## Откат

Удалите скопированные папки и восстановите файлы из `.bak-<дата>`, затем `opencode plugin remove <package>` для пакетных плагинов.
