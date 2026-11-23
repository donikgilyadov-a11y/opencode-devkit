---
name: Graph
description: Строить графы — структуру проекта, импорты и зависимости, а также граф памяти (связи между заметками и тегами). Использовать, когда пользователь просит «граф проекта», «граф памяти», «схему связей», «визуализировать структуру».
---

# Графы

Инструменты плагина `graph-tools`: `graph.project`, `graph.tree`, `graph.memory`, `graph.save`.

## Что умеет

| Инструмент | Что строит |
| --- | --- |
| `graph.project({ directory })` | Граф файлов проекта + связей по imports/require/from/HTML src/MD-ссылкам. Внешние модули — отдельные узлы |
| `graph.tree({ directory })` | Дерево папок и файлов (работает для любого проекта, даже без импортов) |
| `graph.memory()` | Граф второго мозга: `[[вики-ссылки]], markdown-ссылки и теги `#тег` |
| `graph.save({ name, mermaid })` | Сохранить свой Mermaid-граф |

## Примеры

```js
await tools.graph.memory({ name: "memory" })
await tools.graph.project({ directory: "%USERPROFILE%/Desktop/opencode-boost", maxFiles: 100 })
await tools.graph.tree({ directory: "%USERPROFILE%/Desktop/vertikalnoesad" })
```

CLI (без агента):

```powershell
node "%USERPROFILE%\Desktop\opencode-boost\scripts\graph.js" memory
node "%USERPROFILE%\Desktop\opencode-boost\scripts\graph.js" project "<папка>"
node "%USERPROFILE%\Desktop\opencode-boost\scripts\graph.js" tree "<папка>"
```

## Файлы результата

Всё сохраняется в `brain/graphs/`:

- `<name>.mmd` — исходник Mermaid
- `<name>.json` — узлы и рёбра для программ
- `<name>.md` — превью с блоком `mermaid`

Открыть визуально: админка → вкладка «Графы» (http://127.0.0.1:8787/graph.html).

## Как сделать граф памяти полезным

В заметках `brain/` используйте `[[ссылки]]` на другие файлы (можно без `.md`) и теги `#тег`.
Например `[[MEMORY]]`, `[[decisions/0001-opencode-boost]]`, `#opencode`.
Связи и теги попадут в граф автоматически.

## Ограничения

- Пропускаются `node_modules`, `.git`, `dist`, `build`, `coverage`, скрытые папки.
- По умолчанию максимум 250 файлов (параметр `maxFiles`).
- Парсятся импорты JS/TS, Python, HTML и CSS; для других языков — только дерево и MD-ссылки.
