---
name: opencode-tuner
description: Безопасно менять конфигурацию OpenCode, ставить и подключать навыки, команды, агенты, MCP и плагины, проверять сервис. Использовать для любых изменений ~/.config/opencode.
---

# OpenCode Tuner

Версия на этом ПК: 2.3.2. Источник истины: https://opencode.ai/docs/

## Пути (Windows)

- Глобальный конфиг: `%USERPROFILE%\.config\opencode\opencode.jsonc`
- CLI: `%USERPROFILE%\AppData\Local\Programs\@opencode-aidesktop\resources\opencode-cli.exe`
- Навыки: `~/.config/opencode/skills/`
- Команды: `~/.config/opencode/commands/`
- Агенты: `~/.config/opencode/agents/`
- Плагины: `~/.config/opencode/plugins/` или папка из `plugins`

## Правила

1. Перед правкой прочитай текущий файл полностью и сохрани чужие настройки.
2. Не используй поля V1 (`permission`, `tools`, `temperature`, `prompt`) в новых определениях агентов.
3. Не выдумывай поля конфига — сверяйся с https://opencode.ai/docs/config/
4. После изменений проверь:

```powershell
$cli = "$env:LOCALAPPDATA\Programs\@opencode-aidesktop\resources\opencode-cli.exe"
& $cli service status
& $cli api get /api/info
```

5. Сервис перезапускать только если он завис: `opencode service restart`. Конфиг подхватывается сам.
6. Если плагин сломал сервис — убери его из массива `plugins` и вызови `/reload`.

## Что можно включить сразу

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "experimental": { "todo": true },
  "formatter": true
}
```

## MCP

```powershell
opencode mcp add <name> --global --url <url>
opencode mcp list
```

Для входа в MCP через `/mcps` — только из пользовательского интерфейса, не через shell.
