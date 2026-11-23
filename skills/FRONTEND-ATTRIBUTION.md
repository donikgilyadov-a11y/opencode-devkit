# Происхождение навыков

Эти три навыка скачаны из публичных репозиториев и прошли проверку SkillEvaluator.
Лицензии исходников — MIT. Ссылки зафиксированы на конкретных коммитах.

| Навык | Источник | Коммит | Лицензия |
| --- | --- | --- | --- |
| `react-expert` | https://github.com/farmage/opencode-skills/tree/main/skills/react-expert | `2ec14733c1aaa6f98c4b12ecd078ff7c0454710b` | MIT |
| `typescript-pro` | https://github.com/tektite-io/opencode-skills/tree/main/skills/typescript-pro | `2ec14733c1aaa6f98c4b12ecd078ff7c0454710b` | MIT |
| `react-best-practices` | https://github.com/bobum/opencode-skills/tree/master/.opencode/skills/react-best-practices | `4bd8ab3bb9ba80af2c7f3c5db50615a1240b0aaf` | MIT |

## Дополнительные сведения

- `react-expert` и `typescript-pro` происходят от `Jeffallan/claude-skills`
  (автор в `metadata.author` — Jeffallan). В наборе есть каталоги `references/` с
  подробными материалами по React 19, Server Components, хукам, тестированию,
  расширенным типам TypeScript и конфигурации `tsconfig`.
- `react-best-practices` адаптирован из `vercel-labs/agent-skills`
  (автор в `metadata.author` — vercel, `upstream_commit` указан в frontmatter).
  В адаптации убраны правила Next.js и добавлены правила для Vite/React.
- Репозиторий `FrancoStino/opencode-skills-collection` не использовался: все
  разрекламированные точки входа ведут к одному файлу `bundled-skills/development/SKILL.md`.

Файлы скопированы без изменений, кроме проверки совместимости с OpenCode V2.
