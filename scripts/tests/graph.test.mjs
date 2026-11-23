import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  collectFiles,
  buildProjectGraph,
  buildTreeGraph,
  buildMemoryGraph,
  renderMermaid,
  saveGraph,
} from "../graph-core.mjs";

let tmp;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "boost-graph-"));
  fs.writeFileSync(
    path.join(tmp, "a.js"),
    "import { b } from './b.js';\nimport fs from 'fs';\n",
    "utf8"
  );
  fs.writeFileSync(path.join(tmp, "b.js"), "export const b = 1;\n", "utf8");
  fs.mkdirSync(path.join(tmp, "notes"));
  fs.writeFileSync(path.join(tmp, "notes", "one.md"), "# One\n\n[[two]] #тест\n", "utf8");
  fs.writeFileSync(path.join(tmp, "notes", "two.md"), "# Two\n\n[на one](./one.md)\n", "utf8");
  fs.mkdirSync(path.join(tmp, "node_modules"));
  fs.writeFileSync(path.join(tmp, "node_modules", "skip.js"), "module.exports = 1;\n", "utf8");
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("collectFiles пропускает node_modules и_hidden", () => {
  const files = collectFiles(tmp).map((f) => path.relative(tmp, f).replace(/\\/g, "/"));
  assert.ok(files.includes("a.js"));
  assert.ok(files.includes("notes/one.md"));
  assert.ok(!files.some((f) => f.includes("node_modules")));
});

test("buildProjectGraph находит локальный импорт и внешний модуль", () => {
  const g = buildProjectGraph(tmp, { external: true });
  assert.equal(g.kind, "project");
  const a = g.nodes.find((n) => n.label === "a.js");
  const b = g.nodes.find((n) => n.label === "b.js");
  assert.ok(a && b);
  assert.ok(g.edges.some((e) => e.from === a.id && e.to === b.id && e.type === "import"));
  assert.ok(g.externalNodes.some((n) => n.label === "fs"));
  assert.ok(g.edges.some((e) => e.type === "external" && e.label === "fs"));
});

test("buildTreeGraph строит дерево папок", () => {
  const g = buildTreeGraph(tmp);
  assert.equal(g.kind, "tree");
  assert.ok(g.nodes.some((n) => n.type === "dir" && n.label === "notes"));
  assert.ok(g.edges.some((e) => e.type === "tree"));
});

test("buildMemoryGraph связывает вики-ссылки и теги", () => {
  const g = buildMemoryGraph(tmp);
  assert.equal(g.kind, "memory");
  assert.ok(g.nodes.some((n) => n.type === "tag" && n.label === "#тест"));
  assert.ok(g.edges.some((e) => e.type === "wiki"));
  assert.ok(g.edges.some((e) => e.type === "link"));
});

test("renderMermaid и saveGraph создают mmd/json/md", () => {
  const g = buildMemoryGraph(tmp);
  const mmd = renderMermaid(g);
  assert.match(mmd, /^graph LR/m);
  assert.match(mmd, /classDef tag/);
  assert.match(mmd, /-\.->/);

  const tree = buildTreeGraph(tmp);
  assert.match(renderMermaid(tree), /^graph TD/m);

  const saved = saveGraph("test graph", mmd, g, { brainDir: path.join(tmp, "brain") });
  assert.equal(saved.name, "test_graph");
  for (const key of ["mmd", "json", "md"]) {
    assert.ok(fs.existsSync(saved[key]), `${key} не создан`);
  }
  const summary = JSON.parse(fs.readFileSync(saved.json, "utf8"));
  assert.equal(summary.nodes, g.nodes.length);
  assert.equal(summary.edges, g.edges.length);
});
