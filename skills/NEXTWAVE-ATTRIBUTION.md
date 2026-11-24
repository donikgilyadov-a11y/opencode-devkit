# Атрибуция навыков Next Wave

Набор отобран в.deep-исследовании `rr_mwv9k41` и проверен тремя независимыми верификаторами.
Все источники — публичные репозитории с лицензиями MIT или Apache-2.0; коммиты зафиксированы.
В каждый навык скопирован только `SKILL.md` и минимально необходимые справочные файлы/лицензии.
Бинарники, MCP-серверы, облачные ключи, скрипты установки и запись в проверяемый проект не используются.

## Состав

| Навык | Источник | Фиксация | Лицензия | Что скопировано | Почему выбран |
| --- | --- | --- | --- | --- | --- |
| `codebase-onboarding-check` | `Agent-Hellboy/codebase-onboarding-check` | commit `0eb510880dc39324c4bc575a289a45ed9b9b3c46`, tree `1617796596f9385fb47f5d3d98570ddb25a95e19` | MIT | `SKILL.md`, `references/comprehension-checklists.md`, `references/adaptive-coaching.md`, `LICENSE` | Проверка понимания кода после онбординга; доказательства doc→code drift; воспроизводимые чек-листы. Полезно при передаче ai-os-new кодинг-агенту. |
| `tech-writing` | `peizh/tech-writing` | commit `130108dfc9f640727a3b70e0d6ee730fa5a32ff6`, tree `ed20ba93e3d32ebc33a54f88f21ecb68057e760a` | MIT + NOTICE | `SKILL.md`, `LICENSE`, `NOTICE.md` | Писательский стандарт для README, ADR, docs и сообщений об ошибках; ответ на запрос « design/docs/usability ». |
| `shipping-and-launch` | `addyosmani/agent-skills` | tree `e997ac5b9a74eab332d5e9793bb38a38c8cfdd74` | MIT | `SKILL.md`, `LICENSE` | Релизы, canary, откат, feature flags, error-budget gate; закрывает разрыв между `git-commits-prs` и реальным выкатом. |
| `incident-response` | `anthropics/knowledge-work-plugins` | commit `5e504ae11498f2b8daa30d86b7dab97b2ecd8092` | Apache-2.0 | `SKILL.md`, `LICENSE` | SEV1-4, коммуникации и postmortem; секреты не нужны. |
| `ai-agent-evaluation` | `mejbaurbahar/software-tester-skills` | commit `e3ee5dba8ca7cc1aef7bd4ed38e60b374b831002` | MIT | `SKILL.md`, `LICENSE` | Регрессионные наборы, pass@k, ручные метки, promptfoo/DeepEval; для LLM/debate-стека ai-os-new. |
| `flaky-test-management` | `mejbaurbahar/software-tester-skills` | commit `e3ee5dba8ca7cc1aef7bd4ed38e60b374b831002` | MIT | `SKILL.md`, `LICENSE` | Flint rate, SLA 7 дней, 50 последовательных проходов; для большой тестовой базы ai-os-new. |
| `property-based-testing` | `mejbaurbahar/software-tester-skills` | commit `e3ee5dba8ca7cc1aef7bd4ed38e60b374b831002` | MIT | `SKILL.md`, `LICENSE` | Свойства вместо примеров, Hypothesis/fast-check; не пересекается с TDD. |

## Адаптации

- `tech-writing`: справочник `references/chinese-technical-prose.md` НЕ скопирован; все упоминания о китайской прозе удалены из `SKILL.md`, чтобы сканеры мусорных символов оставались зелёными.
- `incident-response`: удалены ключи frontmatter `argument-hint` и ссылка на `CONNECTORS.md`;literal `$ARGUMENTS` заменён на описание от пользователя; заголовок приведён к `# Incident Response`.
- `codebase-onboarding-check`: навык пишет состояние в `%USERPROFILE%\.local\state\codebase-onboarding-check\state.jsonl` (fallback — `memory/state.jsonl` рядом с навыком). Это не проект ai-os-new; при установке Path заменён на home-переменную.

## Не выбрано

- `prompt-eval-and-regression` — лицензия GitHub API `NOASSERTION` и bundle-attribution; вместо него взят clean-MIT `ai-agent-evaluation`.
- `deploy-checklist` — подмножество `shipping-and-launch`.
- `postmortem-writing`, `incident-postmortem` — пересекаются с `incident-response`; при желании можно заменить один на другой.
- `sev1-first-15-minutes`, `slo-sli-error-budgets`, `on-call-best-practices` — валидные, но избыточные рядом с выбранным инцидент-навыком.
- `mutation-testing`, `contract-testing`, `integration-testing`, `performance-testing`, `test-data-engineering`, `llm-testing` — частично пересекаются с уже установленными TDD/verification/performance/API/LLM-навыками или с выбранными трёмя тестовыми.
- Кандидаты с облачными CLI, скриптами, записью в проект или неясной лицензией отклонены верификаторами.

## Проверка

SkillEvaluator 1.0.1: `harness-check ./skills-nextwave-staging --harness opencode -v` → 7/7 load (только advisory OC-RELOAD), `HARNESS_EXIT=0`; `validate ./skills-nextwave-staging --profile default --tiers 1 --checks schema,quality -c -r json,markdown -o reports/nextwave --min-score 70` → 7/7 pass, `VALIDATE_EXIT=0`. Оценки: ai-agent-evaluation A 92.0, codebase-onboarding-check B 89.0, flaky-test-management A 92.0, incident-response B 84.8, property-based-testing A 92.0, shipping-and-launch A 90.2, tech-writing B 87.2. Отчёты: `reports/nextwave/<skill>/`. Publication eligibility неполная (сканеры/LLM не запускались).
