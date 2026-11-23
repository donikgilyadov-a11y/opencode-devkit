// Ядро генерации графов. Используется и CLI (graph.js), и плагином graph-tools.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".svn", "dist", "build", "out", "coverage",
  ".cache", ".next", ".nuxt", "vendor", "__pycache__", ".venv", "graphs",
]);
const CODE_EXT = new Set([
  ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".py", ".go", ".rs",
  ".java", ".rb", ".php", ".md", ".html", ".htm", ".css", ".json",
  ".yml", ".yaml", ".sql", ".sh", ".ps1",
]);

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
const fileId = (f) => "f_" + hash(f);
const tagId = (t) => "t_" + hash(t);
const extId = (e) => "x_" + hash(e);
const rel = (root, f) => path.relative(root, f).split(path.sep).join("/");
const esc = (s) => String(s).replace(/\\/g, "/").replace(/"/g, "'").replace(/[<>{}]/g, "").replace(/\r?\n/g, " ");

export function collectFiles(root, opts = {}) {
  const max = opts.maxFiles || 250;
  const exts = opts.extensions || CODE_EXT;
  const out = [];
  function walk(dir, depth) {
    if (depth > 14 || out.length >= max) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const e of entries) {
      if (out.length >= max) return;
      if (e.isDirectory()) {
        if (e.name.startsWith(".") || SKIP_DIRS.has(e.name)) continue;
        walk(path.join(dir, e.name), depth + 1);
      } else if (e.isFile()) {
        if (e.name.startsWith(".")) continue;
        if (!exts.has(path.extname(e.name).toLowerCase())) continue;
        out.push(path.join(dir, e.name));
      }
    }
  }
  walk(path.resolve(root), 0);
  return out;
}

function extractRefs(file, text) {
  const ext = path.extname(file).toLowerCase();
  const refs = [];
  let m;
  if ([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"].includes(ext)) {
    const re = /(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)|import\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((m = re.exec(text))) refs.push(m[1] || m[2] || m[3]);
  } else if (ext === ".py") {
    const re = /^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/gm;
    while ((m = re.exec(text))) refs.push(m[1] || m[2]);
  } else if (ext === ".html" || ext === ".htm") {
    const re = /(?:src|href)\s*=\s*["']([^"']+)["']/g;
    while ((m = re.exec(text))) refs.push(m[1]);
  } else if (ext === ".css") {
    const re = /(?:@import\s+)?url\(\s*['"]?([^'")]+)['"]?\s*\)|@import\s+['"]([^'"]+)['"]/g;
    while ((m = re.exec(text))) refs.push(m[1] || m[2]);
  } else if (ext === ".md") {
    const wiki = /\[\[([^\]]+)\]\]/g;
    while ((m = wiki.exec(text))) refs.push("[[wikilink:" + m[1] + "]]");
    const link = /\[[^\]]*\]\(([^)]+)\)/g;
    while ((m = link.exec(text))) refs.push(m[1]);
  }
  return refs.filter((r) => r && !/^(https?:|mailto:|data:|#)/.test(r));
}

function resolveRef(fromFile, spec, fileSet) {
  if (spec.startsWith("[[wikilink:")) return { wiki: spec.slice(11, -2) };
  if (!spec.startsWith(".") && !path.isAbsolute(spec)) return { external: spec };
  const clean = spec.split(/[?#]/)[0];
  const base = path.resolve(path.dirname(fromFile), clean);
  const cands = [
    base, base + ".js", base + ".ts", base + ".tsx", base + ".jsx",
    base + ".mjs", base + ".py", base + ".md", base + ".html", base + ".css", base + ".json",
    path.join(base, "index.js"), path.join(base, "index.ts"), path.join(base, "index.md"),
  ];
  for (const c of cands) if (fileSet.has(path.normalize(c))) return { file: path.normalize(c) };
  return null;
}

export function buildProjectGraph(root, opts = {}) {
  const target = path.resolve(root);
  if (!fs.existsSync(target)) throw new Error(`Папка не найдена: ${target}`);
  const files = collectFiles(target, opts);
  const fileSet = new Set(files.map((f) => path.normalize(f)));
  const nodes = files.map((f) => ({ id: fileId(f), label: rel(target, f), file: f, type: "file" }));
  const edges = [];
  const externals = new Map();
  for (const f of files) {
    let text = "";
    try { text = fs.readFileSync(f, "utf8").slice(0, 200000); } catch { continue; }
    for (const spec of extractRefs(f, text)) {
      const r = resolveRef(f, spec, fileSet);
      if (!r) continue;
      if (r.file) edges.push({ from: fileId(f), to: fileId(r.file), type: "import" });
      else if (r.external && opts.external !== false) {
        const name = r.external.replace(/^node:/, "").split("/")[0];
        if (!name) continue;
        externals.set(name, extId(name));
        edges.push({ from: fileId(f), to: extId(name), type: "external", label: name });
      }
    }
  }
  const externalNodes = [...externals].map(([name, id]) => ({ id, label: name, type: "external" }));
  return { kind: "project", root: target, nodes, edges, externalNodes };
}

export function buildTreeGraph(root, opts = {}) {
  const target = path.resolve(root);
  if (!fs.existsSync(target)) throw new Error(`Папка не найдена: ${target}`);
  const files = collectFiles(target, { ...opts, maxFiles: opts.maxFiles || 400 });
  const dirs = new Set();
  for (const f of files) {
    let d = path.dirname(f);
    while (path.resolve(d) !== target && d.startsWith(target)) {
      dirs.add(d);
      d = path.dirname(d);
    }
  }
  dirs.add(target);
  const nodes = [...dirs].map((d) => ({
    id: "d_" + hash(path.normalize(d)),
    label: d === target ? path.basename(target) || target : rel(target, d),
    type: "dir",
  }));
  for (const f of files) nodes.push({ id: fileId(f), label: path.basename(f), file: f, type: "file" });
  const edges = [];
  for (const d of dirs) {
    if (d === target) continue;
    const parent = path.dirname(d);
    edges.push({ from: "d_" + hash(path.normalize(parent)), to: "d_" + hash(path.normalize(d)), type: "tree" });
  }
  for (const f of files) {
    edges.push({ from: "d_" + hash(path.normalize(path.dirname(f))), to: fileId(f), type: "tree" });
  }
  return { kind: "tree", root: target, nodes, edges, externalNodes: [] };
}

export function buildMemoryGraph(brainDir, opts = {}) {
  const root = path.resolve(brainDir);
  if (!fs.existsSync(root)) throw new Error(`Папка мозга не найдена: ${root}`);
  const files = collectFiles(root, { maxFiles: opts.maxFiles || 300, extensions: new Set([".md"]) })
    .filter((f) => !f.split(path.sep).includes("graphs"));
  const fileSet = new Set(files.map((f) => path.normalize(f)));
  const nodes = files.map((f) => ({ id: fileId(f), label: rel(root, f), file: f, type: "note" }));
  const edges = [];
  const tags = new Map();
  for (const f of files) {
    let text = "";
    try { text = fs.readFileSync(f, "utf8").slice(0, 120000); } catch { continue; }
    for (const spec of extractRefs(f, text)) {
      const r = resolveRef(f, spec, fileSet);
      if (r?.wiki) {
        const needle = String(r.wiki).split("|")[0].trim().toLowerCase();
        const target = files.find((x) => path.basename(x, ".md").toLowerCase() === needle || rel(root, x).toLowerCase().includes(needle));
        if (target && target !== f) edges.push({ from: fileId(f), to: fileId(target), type: "wiki", label: "ссылка" });
      } else if (r?.file && r.file !== f) {
        edges.push({ from: fileId(f), to: fileId(r.file), type: "link", label: "ссылка" });
      }
    }
    const tagRe = /(?:^|\s)#([\p{L}\p{N}_-]{2,40})/gu;
    let tm;
    while ((tm = tagRe.exec(text))) {
      const tag = tm[1].toLowerCase();
      if (!tags.has(tag)) tags.set(tag, tagId(tag));
      edges.push({ from: fileId(f), to: tagId(tag), type: "tag", label: "#" + tag });
    }
  }
  const tagNodes = [...tags].map(([tag, id]) => ({ id, label: "#" + tag, type: "tag" }));
  return { kind: "memory", root, nodes: [...nodes, ...tagNodes], edges, externalNodes: [] };
}

export function renderMermaid(graph, opts = {}) {
  const { nodes, edges, externalNodes = [], kind } = graph;
  const groups = new Map();
  for (const n of nodes.filter((n) => n.type !== "tag")) {
    const dir = n.type === "dir" ? path.posix.dirname(n.label) === "." ? "" : path.posix.dirname(n.label)
      : n.type === "note" || n.type === "file" ? path.posix.dirname(n.label) === "." ? "" : path.posix.dirname(n.label) : "";
    if (!groups.has(dir)) groups.set(dir, []);
    groups.get(dir).push(n);
  }
  const lines = [kind === "tree" ? "graph TD" : "graph LR"];
  const dirs = [...groups.keys()].sort((a, b) => a.localeCompare(b));
  for (const dir of dirs) {
    if (!dir) continue;
    lines.push(`  subgraph "${esc(dir)}"`);
    for (const n of groups.get(dir)) lines.push(`    ${n.id}["${esc(n.label)}"]`);
    lines.push("  end");
  }
  for (const n of groups.get("") || []) lines.push(`  ${n.id}["${esc(n.label)}"]`);
  if (nodes.some((n) => n.type === "tag")) {
    lines.push('  subgraph "Теги"');
    for (const n of nodes.filter((n) => n.type === "tag")) lines.push(`    ${n.id}("${esc(n.label)}")`);
    lines.push("  end");
  }
  if (externalNodes.length) {
    lines.push('  subgraph "Внешние модули"');
    for (const n of externalNodes) lines.push(`    ${n.id}["${esc(n.label)}"]`);
    lines.push("  end");
  }
  const styles = [];
  for (const e of edges) {
    const arrow = e.type === "external" || e.type === "tag" ? "-.->" : "-->";
    const label = e.label ? `|${esc(e.label)}|` : "";
    lines.push(`  ${e.from} ${arrow}${label} ${e.to}`);
  }
  lines.push("  classDef note fill:#1f6feb,stroke:#58a6ff,color:#fff");
  lines.push("  classDef tag fill:#6f42c1,stroke:#a371f7,color:#fff");
  for (const n of nodes.filter((n) => n.type === "note")) styles.push(`  class ${n.id} note`);
  for (const n of nodes.filter((n) => n.type === "tag")) styles.push(`  class ${n.id} tag`);
  lines.push(...styles);
  return lines.join("\n");
}

export function saveGraph(name, mermaid, graph, opts = {}) {
  const brainDir = opts.brainDir || path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "brain");
  const outDir = path.join(brainDir, "graphs");
  fs.mkdirSync(outDir, { recursive: true });
  const safe = String(name).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "graph";
  const mmd = path.join(outDir, safe + ".mmd");
  const json = path.join(outDir, safe + ".json");
  const md = path.join(outDir, safe + ".md");
  fs.writeFileSync(mmd, mermaid, "utf8");
  const summary = {
    kind: graph.kind,
    root: graph.root,
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    generated: new Date().toISOString(),
    nodes_detail: graph.nodes.map((n) => ({ id: n.id, label: n.label, type: n.type })),
    edges_detail: graph.edges,
  };
  fs.writeFileSync(json, JSON.stringify(summary, null, 2), "utf8");
  const preview = [
    "# Граф: " + safe,
    "",
    "Тип: " + graph.kind + " · узлов: " + graph.nodes.length + " · связей: " + graph.edges.length,
    "",
    "```mermaid",
    mermaid,
    "```",
    "",
    "Источник: " + String(graph.root || ""),
  ].join("\n");
  fs.writeFileSync(md, preview, "utf8");
  return { name: safe, mmd, json, md };
}
