---
description: Поставить цель долгой автономной работы и начать её выполнять
---

Используй навык `autopilot`, плагины `autopilot-tools`, `@slkiser/opencode-quota` и `@tarquinen/opencode-dcp`.

Цель: $ARGUMENTS

0. Перед стартом вызови `quota_status()` и кратко отметь модель/доступность провайдеров. Если модель
   не в прайс-листе или провайдеры `unavailable` — это не блокер, просто продолжай без догадок.
1. Вызови `autopilot.start` с этой целью. В `stopWhen` запиши проверяемый признак готовности,
   в `maxSteps` — разумный лимит (по умолчанию 50).
2. Выполняй задачу небольшими шагами. После каждого шага вызывай `autopilot.progress(note)`.
3. Важные факты и решения сохраняй через `brain.save`, а рубежи — через `autopilot.checkpoint(note)`.
4. Если контекст разросся: сначала `autopilot.checkpoint("перед сжатием")`, затем `compress` (DCP),
   после этого продолжай от чекпоинта. Цель не потеряется — она в `context`-хуке.
5. Каждые 5 шагов проверяй `quota_status()`. Если лимит исчерпан или бюджет явно превышен —
   `autopilot.stop(reason: "quota/budget", success: false)` и доложи.
6. Если цель достигнута — `autopilot.stop(reason, success: true)`, сохрани итог через `brain.save(..., long: true)`
   и покажи короткий отчёт.
7. Если упёрся в лимит шагов или блокер — `autopilot.stop(reason, success: false)` и запроси указания.
