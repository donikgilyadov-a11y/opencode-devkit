#!/usr/bin/env node
// CLI графов: project / tree / memory / save
const path = require("path");

(async () => {
  const core = await import("./graph-core.mjs");
  const brain = path.join(__dirname, "..", "brain");
  const [cmd, target, ...raw] = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i];
    if (a === "--json") opts.json = true;
    else if (a === "--no-external") opts.external = false;
    else if (a === "--max") opts.maxFiles = Number(raw[++i]);
    else if (a === "--out") opts.name = raw[++i];
  }

  try {
    let graph, name, title;
    if (cmd === "project") {
      graph = core.buildProjectGraph(target || ".", opts);
      name = opts.name || "project-" + path.basename(path.resolve(target || ".")).replace(/[^a-zA-Z0-9_-]/g, "_");
      title = "Граф проекта " + graph.root;
    } else if (cmd === "tree") {
      graph = core.buildTreeGraph(target || ".", opts);
      name = opts.name || "tree-" + path.basename(path.resolve(target || ".")).replace(/[^a-zA-Z0-9_-]/g, "_");
      title = "Дерево проекта " + graph.root;
    } else if (cmd === "memory") {
      graph = core.buildMemoryGraph(brain, opts);
      name = opts.name || "memory";
      title = "Граф памяти";
    } else {
      console.log("Команды: project <папка> | tree <папка> | memory [--json] [--out имя] [--no-external] [--max N]");
      process.exit(1);
    }

    const mermaid = core.renderMermaid(graph, opts);
    const saved = core.saveGraph(name, mermaid, graph, { brainDir: brain });
    if (opts.json) {
      console.log(JSON.stringify({ ...saved, title, kind: graph.kind, nodes: graph.nodes.length, edges: graph.edges.length, mermaid }, null, 2));
    } else {
      console.log(title + "\n" + mermaid + "\n\nФайлы: " + saved.mmd + ", " + saved.json + ", " + saved.md);
    }
  } catch (e) {
    console.error("Ошибка: " + e.message);
    process.exit(1);
  }
})();
