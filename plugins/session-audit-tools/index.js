import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { Plugin } from "@opencode/plugin";

const require = createRequire(import.meta.url);
const HOME = process.env.USERPROFILE || process.env.HOME;
const BOOST = path.join(HOME, "Desktop", "opencode-boost");
const BRAIN = path.join(BOOST, "brain");
const LOG = path.join(HOME, ".local", "share", "opencode", "log", "opencode.log");
const CORE = require(path.join(BOOST, "scripts", "session-audit.js"));

function load(opts) {
  if (!fs.existsSync(LOG)) throw new Error(`Лог не найден: ${LOG}`);
  return CORE.analyze(fs.readFileSync(LOG, "utf8"), { ...opts, logPath: LOG });
}

function short(a) {
  return [
    `Окно: ${a.all ? "весь лог" : `${a.hours} ч`}; строк ${a.scanned}`,
    `Уровни: ${Object.entries(a.levels).map(([k, v]) => `${k} ${v}`).join(" · ") || "—"}`,
    `Запусков CLI: ${a.cliStarts} (пик ${a.peakHour.hour}: ${a.peakHour.count})`,
    `Сигналов: ${a.patterns.length}; циклов: ${a.loops.length}; рекомендаций: ${a.recommendations.length}`,
  ].join("\n");
}

export default Plugin.define({
  id: "session-audit-tools",
  async setup(ctx) {
    const codeOpts = { namespace: "sessionaudit", codemode: true };

    await ctx.tool.transform((editor) => {
      editor.namespace({
        name: "sessionaudit",
        description: "Аудит логов сессий: ошибки, циклы, перезапуски CLI и рекомендации",
      });

      editor.add({
        name: "scan",
        description: "Прочитать лог сессий и вернуть сводку без сохранения отчёта.",
        input: {
          type: "object",
          properties: {
            hours: { type: "integer", description: "Глубина просмотра в часах (по умолчанию 168)" },
            all: { type: "boolean", description: "Сканировать весь лог" },
            limit: { type: "integer", description: "Сколько паттернов показать" },
          },
          additionalProperties: false,
        },
        options: codeOpts,
        execute: async (input) => {
          try {
            const a = load({ hours: input.hours, all: input.all, limit: input.limit });
            const top = a.patterns.slice(0, 6).map((p) => `- ${p.count}× ${p.message}`).join("\n") || "- нет сигналов";
            return { content: `${short(a)}\n\nТоп:\n${top}` };
          } catch (e) {
            return { content: `Аудит не выполнен: ${e.message}` };
          }
        },
      });

      editor.add({
        name: "patterns",
        description: "Повторяющиеся ошибки с конкретными фиксами и тестами.",
        input: {
          type: "object",
          properties: {
            hours: { type: "integer" },
            all: { type: "boolean" },
          },
          additionalProperties: false,
        },
        options: codeOpts,
        execute: async (input) => {
          try {
            const a = load({ hours: input.hours, all: input.all });
            const lines = a.recommendations.map((r, i) => `${i + 1}. ${r.title} (${r.count})\n   Фикс: ${r.fix}\n   Тест: ${r.test}`);
            return { content: lines.join("\n") || "Рекомендаций нет." };
          } catch (e) {
            return { content: `Аудит не выполнен: ${e.message}` };
          }
        },
      });

      editor.add({
        name: "report",
        description: "Полный отчёт аудита сессий с сохранением в brain/reports/.",
        input: {
          type: "object",
          properties: {
            hours: { type: "integer" },
            all: { type: "boolean" },
            name: { type: "string", description: "Необязательное имя (сейчас используется дата)" },
          },
          additionalProperties: false,
        },
        options: codeOpts,
        execute: async (input) => {
          try {
            const a = load({ hours: input.hours, all: input.all });
            const file = CORE.saveReport(a, BRAIN);
            return { content: `${short(a)}\n\nОтчёт: ${file}` };
          } catch (e) {
            return { content: `Аудит не выполнен: ${e.message}` };
          }
        },
      });
    });
  },
});
