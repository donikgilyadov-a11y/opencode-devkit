---
name: second-brain
description: Записывать факты, решения и заметки в постоянную память агента и находить их там. Использовать, когда пользователь говорит "запомни", "сохрани в мозг", "что мы решали", "найди в памяти".
---

# Second Brain

Корень памяти: `%USERPROFILE%\Desktop\opencode-boost\brain`

## Структура

- `MEMORY.md` — индекс, читать первым
- `memory/LONG_TERM.md` — долгосрочные факты
- `memory/YYYY-MM-DD.md` — дневной лог
- `knowledge/` — тематические заметки
- `decisions/NNNN-имя.md` — решения (ADR)
- `projects/` — карточки проектов

## Сохранить

1. Прочитай `MEMORY.md`, чтобы не дублировать.
2. Факт → `memory/LONG_TERM.md`; событие → `memory/<сегодня>.md`; решение → `decisions/`.
3. Строка: `- [HH:MM] тема — суть`. Одна мысль — одна строка.
4. Для важной темы создай отдельный файл в `knowledge/` и добавь ссылку в `MEMORY.md`.
5. Никогда не пиши сюда ключи, пароли и токены.

## Найти

```powershell
node "%USERPROFILE%\Desktop\opencode-boost\scripts\brain.js" find "запрос"
```

Либо grep по `brain/`. Сначала `MEMORY.md`, потом `knowledge/`, потом дневники.

### Теги, ссылки и дайджест

```powershell
node scripts/brain.js tags            # все теги с количеством
node scripts/brain.js tags безопасность
node scripts/brain.js links           # все вики-ссылки [[...]]
node scripts/brain.js links 0003
node scripts/brain.js digest          # дневник за сегодня, сгруппированный по темам
```

Те же возможности даёт плагин `brain-tools`: `brain.tags({tag})`, `brain.links({link})`,
`brain.save/search/index`. Команда `/brain-digest` собирает компактный дайджест дня.

## Формат решения (ADR)

```markdown
# NNNN — Короткое название
- Дата:
- Статус: принято / отклонено

## Контекст
## Решение
## Причины
## Альтернативы
## Последствия
```
