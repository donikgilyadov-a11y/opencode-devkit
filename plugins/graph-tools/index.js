import path from "node:path";
import { pathToFileURL } from "node:url";
import { Plugin } from "@opencode/plugin";

const HOME = process.env.USERPROFILE || process.env.HOME;
const BOOST = path.join(HOME, "Desktop", "opencode-boost");
const BRAIN = path.join(BOOST, "brain");
const CORE_URL = pathToFileURL(path.join(BOOST, "scripts", "graph-core.mjs")).href;

function finish(core, graph, name, opts = {}) {
  const mermaid = core.renderMermaid(graph, opts);
  const files = core.saveGraph(name, mermaid, graph, { brainDir: BRAIN });
  const content = [
    `Граф «${files.name}» · тип: ${graph.kind} · узлов: ${graph.nodes.length} · связей: ${graph.edges.length}`,
    "",
    mermaid,
    "",
    "Файлы:",
    `- ${files.mmd}`,
    `- ${files.json}`,
    `- ${files.md}`,
  ].join("\n");
  return { content };
}

function fail(e) {
  return { content: `Не удалось построить граф: ${e.message}` };
}

export default Plugin.define({
  id: "graph-tools",
  async setup(ctx) {
    const core = await import(CORE_URL);
    const codeOpts = { namespace: "graph", codemode: true };

    await ctx.tool.transform((editor) => {
      editor.namespace({
        name: "graph",
        description: "Графы: структура проекта, импорты, зависимости и связи памяти",
      });

      editor.add({
        name: "project",
        description: "Построить граф проекта по файлам и импортам. directory — абсолютный путь к папке проекта.",
        input: {
          type: "object",
          properties: {
            directory: { type: "string", description: "Путь к папке проекта" },
            name: { type: "string", description: "Имя файла графа (необязательно)" },
            maxFiles: { type: "number", description: "Максимум файлов, по умолчанию 250" },
            external: { type: "boolean", description: "Показывать внешние модули, по умолчанию true" },
          },
          required: ["directory"],
          additionalProperties: false,
        },
        options: codeOpts,
        execute: async (input) => {
          try {
            const g = core.buildProjectGraph(input.directory, {
              maxFiles: input.maxFiles || 250,
              external: input.external !== false,
            });
            return finish(core, g, input.name || "project-" + path.basename(path.resolve(input.directory)).replace(/[^a-zA-Z0-9_-]/g, "_"));
          } catch (e) { return fail(e); }
        },
      });

      editor.add({
        name: "tree",
        description: "Построить граф-дерево структуры папок и файлов проекта.",
        input: {
          type: "object",
          properties: {
            directory: { type: "string", description: "Путь к папке проекта" },
            name: { type: "string", description: "Имя файла графа (необязательно)" },
          },
          required: ["directory"],
          additionalProperties: false,
        },
        options: codeOpts,
        execute: async (input) => {
          try {
            const g = core.buildTreeGraph(input.directory, {});
            return finish(core, g, input.name || "tree-" + path.basename(path.resolve(input.directory)).replace(/[^a-zA-Z0-9_-]/g, "_"));
          } catch (e) { return fail(e); }
        },
      });

      editor.add({
        name: "memory",
        description: "Построить граф памяти: связи между заметками второго мозга и тегами.",
        input: {
          type: "object",
          properties: { name: { type: "string", description: "Имя файла графа, по умолчанию memory" } },
          additionalProperties: false,
        },
        options: codeOpts,
        execute: async (input) => {
          try {
            return finish(core, core.buildMemoryGraph(BRAIN, {}), input.name || "memory");
          } catch (e) { return fail(e); }
        },
      });

      editor.add({
        name: "save",
        description: "Сохранить готовый Mermaid-граф в brain/graphs (mmd, json, md).",
        input: {
          type: "object",
          properties: {
            name: { type: "string", description: "Имя файла" },
            mermaid: { type: "string", description: "Код Mermaid (graph LR / graph TD / ...)" },
          },
          required: ["name", "mermaid"],
          additionalProperties: false,
        },
        options: codeOpts,
        execute: async (input) => {
          try {
            const fake = { kind: "custom", root: "", nodes: [], edges: [] };
            const files = core.saveGraph(input.name, input.mermaid, fake, { brainDir: BRAIN });
            return { content: `Граф сохранён:\n- ${files.mmd}\n- ${files.json}\n- ${files.md}` };
          } catch (e) { return fail(e); }
        },
      });
    });
  },
});
