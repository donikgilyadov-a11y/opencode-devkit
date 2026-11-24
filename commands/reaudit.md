---
description: Повторный read-only аудит исправлений ai-os-new с сравнением с базовой линией
---

Используй навык `reaudit`.

Проверь папку: $ARGUMENTS

1. Если путь не указан, спроси пользователя. Путь должен быть абсолютным.
2. Выполни из `C:\Users\deda donik\Desktop\opencode-boost`:
   `& 'C:\Program Files\nodejs\node.exe' scripts/reaudit.js "<папка>" --name ai-os-new`
3. Скрипт только читает файлы, не запускает сборки/тесты/git в проверяемой папке и не меняет её.
4. Сравни результат с `brain/reports/reaudit-baseline-ai-os-new.json`: что закрылось, что осталось открытым, что появилось в регресс.
5. Отчёт сохраняется в `brain/reports/ai-os-new-reaudit-YYYY-MM-DD.md`;Важные находки сохрани через `brain.save(topic, text, long?)`.
6. Ничего не меняй в проверяемой папке без отдельного явного запроса.
