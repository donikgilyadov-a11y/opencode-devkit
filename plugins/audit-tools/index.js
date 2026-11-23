import path from "node:path";
import { pathToFileURL } from "node:url";
import { Plugin } from "@opencode/plugin";

const HOME = process.env.USERPROFILE || process.env.HOME;
const BOOST = path.join(HOME, "Desktop", "opencode-boost");
const BRAIN = path.join(BOOST, "brain");
const CORE_URL = pathToFileURL(path.join(BOOST, "scripts", "audit-core.mjs")).href;

export default Plugin.define({
  id: "audit-tools",
  async setup(ctx) {
    const core = await import(CORE_URL);
    const codeOpts = { namespace: "audit", codemode: true };

    await ctx.tool.transform((editor) => {
      editor.namespace({
        name: "audit",
        description: "Аудит репозиториев только для чтения: структура, git, риски, отчёты",
      });

      editor.add({
        name: "repo",
        description: "Проверить папку репозитория без изменений и сохранить отчёт в brain/reports.",
        input: {
          type: "object",
          properties: {
            directory: { type: "string", description: "Абсолютный путь к папке репозитория" },
            name: { type: "string", description: "Имя отчёта (необязательно)" },
          },
          required: ["directory"],
          additionalProperties: false,
        },
        options: codeOpts,
        execute: async (input) => {
          try {
            const a = core.auditRepo(input.directory, { name: input.name });
            const out = core.saveReport(a, BRAIN);
            return { content: `${core.renderReport(a)}\n\nОтчёт: ${out}` };
          } catch (e) {
            return { content: `Аудит не выполнен: ${e.message}` };
          }
        },
      });

      editor.add({
        name: "quick",
        description: "Быстрый аудит папки без сохранения отчёта — только сводка.",
        input: {
          type: "object",
          properties: { directory: { type: "string", description: "Абсолютный путь к папке" } },
          required: ["directory"],
          additionalProperties: false,
        },
        options: codeOpts,
        execute: async (input) => {
          try {
            const a = core.auditRepo(input.directory);
            return { content: [
              `${a.name}: файлов ${a.files}, ${(a.bytes / 1024 / 1024).toFixed(2)} МБ, ветка ${a.git.branch || "—"}`,
              `README: ${a.heading || "—"}`,
              `TODO/FIXME: ${a.todos} · возможных секретов: ${a.secretHits.length}`,
              `Origin: ${a.git.remote || "—"}`,
            ].join("\n") };
          } catch (e) {
            return { content: `Аудит не выполнен: ${e.message}` };
          }
        },
      });
    });
  },
});
