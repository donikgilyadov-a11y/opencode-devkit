# Атрибуция навыков UI/UX и дизайна

Набор из четырёх навыков для дизайна, вёрстки, доступности и usability. Все исходники — публичные репозитории с разрешительными лицензиями; коммиты зафиксированы по SHA. Исполняемые файлы, хуки, телеметрия и запись файлов в проект не копировались.

## Источники

| Навык (локальная папка) | Источник | Зафиксированный коммит | Лицензия | Что скопировано |
| --- | --- | --- | --- | --- |
| `frontend-ui-engineering` | `addyosmani/agent-skills`, `skills/frontend-ui-engineering/` | `e997ac5b9a74eab332d5e9793bb38a38c8cfdd74` | MIT | `SKILL.md` и `references/shared/accessibility-checklist.md` |
| `accessibility-engineering` | `addyosmani/agent-skills`, `skills/accessibility-engineering/` | `e997ac5b9a74eab332d5e9793bb38a38c8cfdd74` | MIT | `SKILL.md`, `references/shared/accessibility-checklist.md`, `scripts/audit-a11y.sh` (только как справочный материал; `npx` не запускался) |
| `web-design-guidelines` | `vercel-labs/agent-skills`, `skills/web-design-guidelines/` | `5a37a6329fbad3666c3207392a6a7c0110e92efb` | MIT | `SKILL.md` и `references/command.md` |
| `vercel-composition-patterns` | `vercel-labs/agent-skills`, `skills/composition-patterns/` | `5a37a6329fbad3666c3207392a6a7c0110e92efb` | MIT | `SKILL.md`, `AGENTS.md`, `README.md`, `metadata.json`, все файлы `rules/*.md` |

Локальная папка `vercel-composition-patterns` переименована относительно upstream `composition-patterns`, чтобы имя совпадало с frontmatter `name:` и правилам OpenCode. Содержимое файлов не менялось.

## Почему именно эти четыре

- `frontend-ui-engineering` — архитектура компонентов, дизайн-система, токены, адаптивность 320/768/1024/1440, состояния загрузки/ошибки и WCAG 2.1 AA без тяжёлых зависимостей.
- `accessibility-engineering` — проверка WCAG 2.2 AA, ручной аудит клавиатуры/скринридера и распределение находок по важности; внешние `npx`-утилиты упомянуты в тексте, но не запускались и не устанавливались.
- `web-design-guidelines` — 100+ правил Vercel по фокусу, формам, типографике, изображениям, анимации, тёмной теме, touch и i18n в одном справочном файле.
- `vercel-composition-patterns` — композиция React без булевых пропсов, compound components, явные варианты, state-context interface и особенности React 19; закрывает разрыв после `react-expert` и `react-best-practices`.

## Не установлено

- `pbakaus/impeccable` (коммит `b49177d32788f2dc585c42831d845dacf1ebed2c`, Apache-2.0) — поставляет бинарный движок, хуки, телеметрию и записывает `PRODUCT.md` / `DESIGN.md` в проект; для работы только на чтение не подходит.
- `nextlevelbuilder/ui-ux-pro-max-skill` (коммит `a4fc248f6136552cb881e298847abc7ddce84e6b`) — требует Python 3 и больших CSV-каталогов; на этой машине Python отсутствует.
- `writing-guidelines`, `react-view-transitions`, `react-native` — не являются ядром запроса или пересекаются с уже установленными навыками.

## Проверка

SkillEvaluator v1.0.1: `harness-check --harness opencode` — 4/4 загружаются (только advisory `OC-RELOAD`); `validate --tiers 1 --checks schema,quality --min-score 70` — **4/4 проходят**, exit 0. Оценки: `frontend-ui-engineering` A 90.2, `vercel-composition-patterns` B 89.5, `web-design-guidelines` B 83.0, `accessibility-engineering` B 83.2. Перед финальным прогоном в `web-design-guidelines` заменён литерал `$ARGUMENTS` на описание в words и убраны угловые скобки из `metadata.argument-hint` (иначе QUALITY/SCHEMA-fail). Остальные замечания — стилистические.
