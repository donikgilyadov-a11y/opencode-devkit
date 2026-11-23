import fs from "node:fs"
import path from "node:path"
import { Plugin } from "@opencode/plugin"

const DEFAULT_BRAIN = "%USERPROFILE%/Desktop/opencode-boost/brain"

function day() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function stamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, "0")
  return `${p(d.getHours())}:${p(d.getMinutes())}`
}

function walk(dir, out = []) {
  let entries
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return out }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.name.endsWith(".md")) out.push(full)
  }
  return out
}

export default Plugin.define({
  id: "brain-tools",
  async setup(ctx) {
    const brain = ctx.options?.brainPath || DEFAULT_BRAIN
    const memory = path.join(brain, "memory")
    const long = path.join(memory, "LONG_TERM.md")

    await ctx.tool.transform((editor) => {
      editor.namespace({
        name: "brain",
        description: "Инструменты второго мозга: сохранение и поиск памяти",
      })

      editor.add({
        name: "save",
        description: "Сохранить факт или заметку во второй мозг. topic — короткая тема, text — суть, long — добавить в долгосрочную память.",
        input: {
          type: "object",
          properties: {
            topic: { type: "string", description: "Короткая тема" },
            text: { type: "string", description: "Суть записи" },
            long: { type: "boolean", description: "Добавить в LONG_TERM.md" },
          },
          required: ["topic", "text"],
          additionalProperties: false,
        },
        options: { namespace: "brain", codemode: true },
        execute: async ({ topic, text, long: toLong }) => {
          if (!topic || !text) return { content: "Нужны topic и text" }
          fs.mkdirSync(memory, { recursive: true })
          const daily = path.join(memory, `${day()}.md`)
          const line = `- [${stamp()}] ${topic} — ${text}`
          if (!fs.existsSync(daily)) fs.writeFileSync(daily, `# ${day()}\n\n`, "utf8")
          fs.appendFileSync(daily, line + "\n", "utf8")
          if (toLong) fs.appendFileSync(long, line + "\n", "utf8")
          return { content: `Сохранено: ${path.relative(brain, daily)}${toLong ? " + LONG_TERM.md" : ""}\n${line}` }
        },
      })

      editor.add({
        name: "search",
        description: "Найти записи во втором мозге по подстроке (без учёта регистра).",
        input: {
          type: "object",
          properties: { query: { type: "string", description: "Что искать" } },
          required: ["query"],
          additionalProperties: false,
        },
        options: { namespace: "brain", codemode: true },
        execute: async ({ query }) => {
          const q = String(query || "").toLowerCase()
          if (!q) return { content: "Пустой запрос" }
          const lines = []
          for (const file of walk(brain)) {
            const content = fs.readFileSync(file, "utf8").split(/\r?\n/)
            content.forEach((line, i) => {
              if (line.toLowerCase().includes(q)) lines.push(`${path.relative(brain, file)}:${i + 1}: ${line.trim()}`)
            })
          }
          return { content: lines.length ? lines.slice(0, 60).join("\n") + `\n\nНайдено: ${lines.length}` : "Ничего не найдено" }
        },
      })

      editor.add({
        name: "tags",
        description: "Показать все теги (#тег) с количеством или найти строки по тегу.",
        input: {
          type: "object",
          properties: { tag: { type: "string", description: "Часть тега без решётки; пусто — список всех" } },
          additionalProperties: false,
        },
        options: { namespace: "brain", codemode: true },
        execute: async ({ tag }) => {
          const filter = String(tag || "").replace(/^#/, "").toLowerCase()
          const counts = new Map()
          const hits = []
          for (const file of walk(brain)) {
            const content = fs.readFileSync(file, "utf8").split(/\r?\n/)
            content.forEach((line, i) => {
              for (const match of line.matchAll(/#([А-Яа-яЁёA-Za-z0-9_-]+)/g)) {
                const name = match[1]
                if (/^[0-9a-fA-F]{3,8}$/.test(name)) continue
                counts.set(name, (counts.get(name) || 0) + 1)
                if (filter && name.toLowerCase().includes(filter)) hits.push(`${path.relative(brain, file)}:${i + 1}: ${line.trim()}`)
              }
            })
          }
          if (filter) return { content: hits.length ? hits.slice(0, 80).join("\n") + `\n\nНайдено: ${hits.length}` : "Теги не найдены" }
          const list = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, n]) => `#${name} — ${n}`)
          return { content: list.join("\n") || "Тегов нет" }
        },
      })

      editor.add({
        name: "links",
        description: "Показать вики-ссылки [[...]] с количеством или найти строки по ссылке.",
        input: {
          type: "object",
          properties: { link: { type: "string", description: "Часть имени ссылки; пусто — список всех" } },
          additionalProperties: false,
        },
        options: { namespace: "brain", codemode: true },
        execute: async ({ link }) => {
          const filter = String(link || "").toLowerCase()
          const counts = new Map()
          const hits = []
          for (const file of walk(brain)) {
            const content = fs.readFileSync(file, "utf8").split(/\r?\n/)
            content.forEach((line, i) => {
              for (const match of line.matchAll(/\[\[([^\]]+)\]\]/g)) {
                const name = match[1]
                counts.set(name, (counts.get(name) || 0) + 1)
                if (filter && name.toLowerCase().includes(filter)) hits.push(`${path.relative(brain, file)}:${i + 1}: ${line.trim()}`)
              }
            })
          }
          if (filter) return { content: hits.length ? hits.slice(0, 80).join("\n") + `\n\nНайдено: ${hits.length}` : "Ссылки не найдены" }
          const list = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, n]) => `[[${name}]] — ${n}`)
          return { content: list.join("\n") || "Ссылок нет" }
        },
      })

      editor.add({
        name: "index",
        description: "Прочитать индекс второго мозга (MEMORY.md).",
        input: { type: "object", properties: {}, additionalProperties: false },
        options: { namespace: "brain", codemode: true },
        execute: async () => {
          try { return { content: fs.readFileSync(path.join(brain, "MEMORY.md"), "utf8") } }
          catch (e) { return { content: `Не удалось прочитать индекс: ${e.message}` } }
        },
      })
    })
  },
})
