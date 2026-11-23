# Паттерны MD-конфигурации

## AGENTS.md — инструкции проекта

```markdown
# Проект

## Запуск
npm install && npm run dev

## Правила
- Не менять файлы в `generated/`.
- Перед коммитом — `npm test`.
- Отвечать кратко.
```

## SKILL.md с supporting files

```
.opencode/skills/release/
├── SKILL.md
├── scripts/changelog.ts
└── references/policy.md
```

В `SKILL.md` пути указываются относительно папки навыка. Supporting files не грузятся автоматически — агент читает их по ссылке.

## Команда с shell-блоком

````markdown
---
description: Показать diff
---

Проверь изменения:

!`git diff --stat && git diff`
````

`!` + backtick выполняется до отправки промпта. Не подставляйте туда пользовательский ввод.

## Команда с позиционными аргументами

```markdown
Сравни $1 с $2 и объясни различия.
```

`/compare a b` → `Сравни a с b и объясни различия.`

## Агент только для чтения

```markdown
---
description: Ревизор кода
mode: subagent
permissions:
  - action: edit
    resource: "*"
    effect: deny
  - action: shell
    resource: "*"
    effect: deny
---

Проверь корректность и безопасность. Выдай находки по серьёзности с файлами и строками.
```

## Плагин (V2, локальный)

```
.opencode/plugins/example/
├── package.json
└── index.ts
```

```json
{
  "name": "example",
  "version": "1.0.0",
  "type": "module",
  "dependencies": { "@opencode/plugin": "latest" }
}
```

```typescript
import { Plugin } from "@opencode/plugin"
export default Plugin.define({
  id: "example",
  setup(ctx) {
    // регистрация tools/hooks/commands
  },
})
```
