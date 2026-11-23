import fs from "node:fs"
import path from "node:path"
import { Plugin } from "@opencode/plugin"

const HOME = process.env.USERPROFILE || process.env.HOME
const BRAIN = path.join(HOME, "Desktop", "opencode-boost", "brain")
const AUTO = path.join(BRAIN, "autonomy")
const STATE = path.join(AUTO, "GOAL.json")
const PROGRESS = path.join(AUTO, "PROGRESS.md")
const CHECKPOINTS = path.join(AUTO, "CHECKPOINTS.md")

function stamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function ensure() {
  fs.mkdirSync(AUTO, { recursive: true })
  for (const [file, title] of [
    [PROGRESS, "# Автопилот: журнал прогресса"],
    [CHECKPOINTS, "# Автопилот: чекпоинты"],
  ]) {
    if (!fs.existsSync(file)) fs.writeFileSync(file, `${title}\n\n`, "utf8")
  }
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE, "utf8"))
  } catch {
    return null
  }
}

function writeState(state) {
  ensure()
  state.updatedAt = stamp()
  fs.writeFileSync(STATE, JSON.stringify(state, null, 2) + "\n", "utf8")
}

function append(file, line) {
  ensure()
  fs.appendFileSync(file, line + "\n", "utf8")
}

function lastLines(file, n = 5) {
  try {
    return fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-n)
      .join("\n")
  } catch {
    return ""
  }
}

function summary(state) {
  if (!state || !state.goal) return "Автопилот не активен."
  return [
    `Цель: ${state.goal}`,
    `Статус: ${state.status}`,
    `Шаг ${state.steps || 0}/${state.maxSteps || 0}`,
    `Стоп-условие: ${state.stopWhen || "не задано"}`,
  ].join(" | ")
}

export default Plugin.define({
  id: "autopilot-tools",
  async setup(ctx) {
    await ctx.tool.transform((editor) => {
      editor.namespace({
        name: "autopilot",
        description: "Долгая автономная работа: цель, прогресс, чекпоинты и стоп-условия",
      })

      editor.add({
        name: "start",
        description: "Поставить цель автопилота. Появляется напоминание в каждом запросе модели и журнал прогресса.",
        input: {
          type: "object",
          properties: {
            goal: { type: "string", description: "Конкретная цель" },
            maxSteps: { type: "number", description: "Максимум шагов до обязательной остановки (по умолчанию 50)" },
            stopWhen: { type: "string", description: "Условие остановки: что означает 'готово'" },
          },
          required: ["goal"],
          additionalProperties: false,
        },
        options: { namespace: "autopilot", codemode: true },
        execute: async (input) => {
          try {
            const state = {
              goal: String(input.goal || "").trim(),
              status: "active",
              steps: 0,
              maxSteps: Math.max(1, Number(input.maxSteps) || 50),
              stopWhen: String(input.stopWhen || "результат проверен и сохранён"),
              createdAt: stamp(),
              updatedAt: stamp(),
            }
            if (!state.goal) return { content: "Нужна цель (goal)" }
            writeState(state)
            append(PROGRESS, `- [${stamp()}] СТАРТ: ${state.goal}`)
            return {
              content: `Автопилот запущен.\n${summary(state)}\n\nРаботай шагами: после каждого действительного шага вызывай autopilot.progress(note), при достижении цели — autopilot.stop(reason). Цель видна модели даже после сжатия контекста.`,
            }
          } catch (e) {
            return { content: `Не удалось запустить автопилот: ${e.message}` }
          }
        },
      })

      editor.add({
        name: "status",
        description: "Показать текущую цель автопилота, счётчик шагов и последние записи прогресса.",
        input: { type: "object", properties: {}, additionalProperties: false },
        options: { namespace: "autopilot", codemode: true },
        execute: async () => {
          const state = readState()
          const tail = lastLines(PROGRESS, 5)
          return { content: `${summary(state)}${tail ? `\n\nПоследние шаги:\n${tail}` : ""}` }
        },
      })

      editor.add({
        name: "progress",
        description: "Отметить выполненный шаг. Вызывай после каждого осмысленного действия во время долгой работы.",
        input: {
          type: "object",
          properties: {
            note: { type: "string", description: "Что сделано на этом шаге" },
            done: { type: "boolean", description: "Этот шаг завершён успешно (по умолчанию true)" },
          },
          required: ["note"],
          additionalProperties: false,
        },
        options: { namespace: "autopilot", codemode: true },
        execute: async (input) => {
          try {
            const state = readState()
            if (!state || state.status !== "active") return { content: "Автопилот не активен. Сначала autopilot.start(goal)." }
            state.steps = Number(state.steps || 0) + 1
            state.lastProgress = String(input.note || "").trim()
            const ok = input.done !== false
            if (!ok) state.status = "paused"
            writeState(state)
            append(PROGRESS, `- [${stamp()}] ${ok ? "OK" : "ПРОБЛЕМА"} #${state.steps}: ${state.lastProgress}`)
            if (state.steps >= state.maxSteps) {
              state.status = "paused"
              writeState(state)
              return {
                content: `${summary(state)}\n\nДостигнут лимит шагов. Остановись и доложи пользователю, либо явно продолжи через autopilot.start с новым лимитом.`,
              }
            }
            return { content: `Шаг ${state.steps}/${state.maxSteps} записан.\n${summary(state)}` }
          } catch (e) {
            return { content: `Не удалось записать прогресс: ${e.message}` }
          }
        },
      })

      editor.add({
        name: "checkpoint",
        description: "Сохранить чекпоинт: текущая цель, прогресс и произвольная заметка. Полезно перед сжатием контекста.",
        input: {
          type: "object",
          properties: { note: { type: "string", description: "Что зафиксировать" } },
          additionalProperties: false,
        },
        options: { namespace: "autopilot", codemode: true },
        execute: async (input) => {
          try {
            const state = readState()
            const note = String(input.note || "").trim()
            append(
              CHECKPOINTS,
              `## ${stamp()}\n\n${summary(state)}\n\n${note || "без заметки"}\n\n---`,
            )
            return { content: `Чекпоинт сохранён: ${path.relative(BRAIN, CHECKPOINTS)}\n${summary(state)}` }
          } catch (e) {
            return { content: `Не удалось сохранить чекпоинт: ${e.message}` }
          }
        },
      })

      editor.add({
        name: "stop",
        description: "Завершить или остановить автопилот и записать итог в журнал и чекпоинты.",
        input: {
          type: "object",
          properties: {
            reason: { type: "string", description: "Почему остановились / что получено" },
            success: { type: "boolean", description: "Цель достигнута (по умолчанию true)" },
          },
          required: ["reason"],
          additionalProperties: false,
        },
        options: { namespace: "autopilot", codemode: true },
        execute: async (input) => {
          try {
            const state = readState() || { goal: "—", steps: 0, maxSteps: 0 }
            const success = input.success !== false
            state.status = success ? "done" : "stopped"
            state.result = String(input.reason || "").trim()
            writeState(state)
            const line = `- [${stamp()}] ${success ? "ФИНИШ" : "ОСТАНОВ"}: ${state.result}`
            append(PROGRESS, line)
            append(CHECKPOINTS, `## ${stamp()}\n\n${summary(state)}\n\n${line}\n\n---`)
            return { content: `Автопилот завершён (${state.status}).\n${line}` }
          } catch (e) {
            return { content: `Не удалось остановить автопилот: ${e.message}` }
          }
        },
      })
    })

    // Напоминание о цели в каждом запросе модели — выживает после compaction.
    await ctx.session.hook("context", (event) => {
      try {
        const state = readState()
        if (!state || state.status !== "active" || !state.goal) return
        const text = [
          "АВТОПИЛОТ (активен):",
          `Цель: ${state.goal}`,
          `Шаг: ${state.steps || 0}/${state.maxSteps || 0}`,
          `Стоп-условие: ${state.stopWhen || "результат проверен и сохранён"}`,
          state.lastProgress ? `Последний шаг: ${state.lastProgress}` : "",
          "Продолжай работу без лишних вопросов; после шага вызови autopilot.progress, у цели — autopilot.stop.",
        ]
          .filter(Boolean)
          .join("\n")
        event.system.push({ type: "text", text })
      } catch {
        // Хук не должен ломать запрос к модели.
      }
    })

    // Авто-чекпоинт перед сжатием истории.
    await ctx.session.hook("compaction", async () => {
      try {
        const state = readState()
        if (!state || state.status !== "active") return
        append(CHECKPOINTS, `## ${stamp()} — авто-чекпоинт при сжатии контекста\n\n${summary(state)}\n\n---`)
      } catch {
        // best effort
      }
    })
  },
})
