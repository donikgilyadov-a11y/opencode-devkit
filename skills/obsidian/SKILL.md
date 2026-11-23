---
name: obsidian
description: Работа с заметками Obsidian через Local REST API — читать, искать, писать и открывать файлы vault напрямую из OpenCode. Использовать, когда нужно найти или изменить заметку во втором мозге, не прибегая к обычным файловым инструментам.
---

# Obsidian (Local REST API)

Vault подключён к OpenCode как удалённый MCP-сервер `obsidian` через локальный прокси
`scripts/obsidian-mcp-proxy.js`. Прокси читает API-ключ из
`brain/.obsidian/plugins/obsidian-local-rest-api/data.json` и подставляет заголовок
`Authorization`, поэтому секрет не лежит в конфиге OpenCode.

## Инструменты

- `obsidian.vault_list()` — список файлов и папок vault.
- `obsidian.vault_read({path})`, `vault_write`, `vault_append`, `vault_patch`, `vault_delete`,
  `vault_move`, `vault_copy`, `vault_get_document_map` — работа с файлами.
- `obsidian.search_simple({query, maxResults})` — поиск по содержимому.
- `obsidian.search_query({query})` — поиск по метаданным (JsonLogic).
- `obsidian.tag_list()`, `obsidian.active_file_get_path()`.
- `obsidian.open_file({path, newLeaf})` — открыть заметку в UI Obsidian.
- `obsidian.command_list()`, `obsidian.command_execute({commandId})` — команды Obsidian.
- `obsidian.events_get_listener_url(...)` — SSE-подписка на события (без ключа в URL).

## Правила

1. Пути указываются относительно корня vault: `MEMORY.md`, `memory/2026-11-23.md`.
2. Для долгосрочных фактов предпочитай `brain.save(..., long: true)` — он пишет и в дневник, и в LONG_TERM.
3. Не включай доступ к `.obsidian/` через REST API: настройки и ключ должны оставаться недоступны.
4. Если `obsidian.*` недоступен, проверь: Obsidian запущен во vault `brain`, плагин Local REST API включён,
   порты 27123 (REST) и 27125 (прокси) слушаются, `opencode mcp list` показывает `obsidian`.

## Помощь

План и детали: `~/Desktop/opencode-wiki/wiki/obsidian-integration.md`, ADR `brain/decisions/0004-obsidian-integration.md`.

#obsidian #opencode
