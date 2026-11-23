---
description: План авто-врача OpenCode — что можно починить
agent: oc-admin
---

Запусти диагностику в режиме плана (ничего не меняется):

!`& 'C:\Program Files\nodejs\node.exe' "$env:USERPROFILE\Desktop\opencode-boost\scripts\oc-doctor.js" --json`

Кратко перечисли найденные действия, их тип (`auto` — чинится автоматически, `manual` — нужно вручную) и детали. Если действий нет, скажи «всё здорово». Для реального исправления предложи `/oc-doctor-fix`.
