---
description: Диагностика OpenCode — версия, сервис, API
agent: oc-admin
---

Проверь состояние OpenCode. Данные:

!`& "$env:LOCALAPPDATA\Programs\@opencode-aidesktop\resources\opencode-cli.exe" --version; & "$env:LOCALAPPDATA\Programs\@opencode-aidesktop\resources\opencode-cli.exe" service status; & "$env:LOCALAPPDATA\Programs\@opencode-aidesktop\resources\opencode-cli.exe" api get /api/info`

Выведи краткий отчёт: версия, жив ли сервис, issue ли ошибки. Если что-то не так — предложи действие.
