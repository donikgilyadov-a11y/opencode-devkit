---
description: Показать состояние computer use и browser use, затем выполнить действие с GUI/браузером
---

Используй навык `computer-use`.

Задача: $ARGUMENTS

1. Проверь доступные пространства имён через `search({namespace:"computer"})` и
   `search({namespace:"browser"})`.
2. Для GUI вызови `computer.info()` и `computer.screenshot()`, при необходимости `computer.windows()`
   и `computer.activate()`. Выполни действие (`move`, `click`, `type`, `key`, `hotkey`, `scroll`).
3. Для браузера открой вкладку `browser.tabs.open(url)`, возьми `browser.snapshot(tabID)` и
   работай по ref-элементам. Проверяй `browser.console(tabID)` при ошибках.
4. После каждого изменения состояния сделай повторный скриншот или snapshot.
5. Важные факты сохрани через `brain.save`. Коротко доложи, что получилось.
