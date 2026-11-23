# OpenCode DevKit

Набор расширений для **OpenCode V2** на Windows: второй мозг, навыки, команды, агенты, собственные плагины, вторая админка, графы, тесты и мост с Obsidian.

Репозиторий — только код и шаблоны. Он **не содержит** личную память, ключи, токены, файлы `service*.json` и сторонние плагины Obsidian.

## Состав

| Папка | Что внутри |
| --- | --- |
| `plugins/` | 5 локальных плагинов OpenCode: `brain-tools`, `graph-tools`, `autopilot-tools`, `computer-tools`, `audit-tools` |
| `skills/` | 9 навыков: `second-brain`, `opencode-tuner`, `md-examples`, `admin-panel`, `graph`, `autopilot`, `computer-use`, `repo-audit`, `obsidian` |
| `commands/` | 11 глобальных команд (`/brain`, `/oc-check`, `/repo-audit`, …) |
| `agents/` | 2 подагента: `brain-keeper`, `oc-admin` |
| `admin/` | Вторая админка на `http://127.0.0.1:8787` (дашборд, логи, безопасность, графы, проверки) |
| `scripts/` | CLI второго мозга, графов, аудита, самопроверки, дым-теста, Obsidian-прокси и watchdog |
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
& 'C:\Program Files\nodejs\npm.cmd' test        # 13 юнит-тестов
node scripts\smoke-admin.js                     # 8 проверок админки (нужен запущенный сервер)
node scripts\oc-check.js --json                 # самопроверка сборки (20 проверок)
```

## Безопасность

- Секреты не хранятся в репозитории: ключ Obsidian-прокси читается из `data.json` плагина в vault, в конфиге OpenCode только `http://127.0.0.1:27125/mcp/`.
- `cc-safety-net` блокирует опасные shell-команды и доступ к `.env`/SSH; `envsitter-guard` даёт безопасные `envsitter_*` инструменты без вывода значений. Не обходите эти блокировки.
- `opencode-v2-ponytail-scoped` по умолчанию выключен.
- Аудит сторонних репозиториев — только для чтения.

Документация с примерами и историей решений: [opencode-wiki](https://github.com/donikgilyadov-a11y/opencode-wiki).
