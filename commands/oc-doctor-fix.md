---
description: Применить безопасные авто-фиксы OpenCode (с бэкапами)
---

ВНИМАНИЕ: команда применяет исправления и создаёт бэкапы в `~/Desktop/opencode-boost/brain/reports/doctor-backups/`. Ручные пункты пропускаются.

Выполни:

!`& 'C:\Program Files\nodejs\node.exe' "$env:USERPROFILE\Desktop\opencode-boost\scripts\oc-doctor.js" --apply --json $ARGUMENTS`

Доложи: что исправлено, что пропущено как ручное, результат перепроверки `oc-check` и путь к бэкапам. Флаг `--service` разрешает авто-врачу перезапустить сервис OpenCode; без него перезапуск только рекомендуется.
