const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reaudit-test-"));
process.env.OPENCODE_BRAIN = tmp;
process.env.USERPROFILE = tmp;
const ra = require("../reaudit");

test("redact маскирует токены и домашний путь", () => {
  const line = `apiKey = "abcdefgh12345678" sk-abcdefgh12345678 C:\\Users\\tester\\secret`;
  const out = ra.redact(line);
  assert.match(out, /apiKey=\[REDACTED\]/);
  assert.doesNotMatch(out, /abcdefgh12345678/);
  assert.doesNotMatch(out, /sk-/);
});

test("buildIndex находит файл по имени, если точный путь не совпал", () => {
  const root = path.join(tmp, "repo");
  fs.mkdirSync(path.join(root, "src", "deep"), { recursive: true });
  const file = path.join(root, "src", "deep", "permission-middleware.ts");
  fs.writeFileSync(file, "// check", "utf8");
  const index = ra.buildIndex(root);
  const resolved = ra.resolveFile(root, index, "wrong/path/permission-middleware.ts");
  assert.equal(resolved, file);
});

test("evaluateCheck видит открытый паттерн", () => {
  const root = path.join(tmp, "repo-open");
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "src", "svc.ts"), "if (!ctx.agentId) return { kind: 'allow' };\n", "utf8");
  const res = ra.evaluateCheck({
    id: "T-OPEN", severity: "P0", title: "fail-open", files: ["svc.ts"],
    open: ["if\\s*\\(\\s*!\\s*ctx\\.agentId\\s*\\)\\s*return\\s*\\{\\s*kind:\\s*['\"]allow['\"]"],
    fixed: ["default-deny"], window: 3,
  }, root, ra.buildIndex(root));
  assert.equal(res.status, "open");
  assert.match(res.evidence[0], /svc\.ts:1/);
});

test("evaluateCheck признаёт исправление рядом с паттерном", () => {
  const root = path.join(tmp, "repo-fixed");
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "src", "svc.ts"),
    "if (!ctx.agentId) {\n  // default-deny\n  return { kind: 'deny' };\n}\n", "utf8");
  const res = ra.evaluateCheck({
    id: "T-FIX", severity: "P0", title: "fixed", files: ["svc.ts"],
    open: ["if\\s*\\(\\s*!\\s*ctx\\.agentId"],
    fixed: ["default-deny"], window: 3,
  }, root, ra.buildIndex(root));
  assert.equal(res.status, "fixed");
});

test("diffBaseline находит закрытые и регрессы", () => {
  const baseline = { checks: [
    { id: "a", status: "open" },
    { id: "b", status: "fixed" },
    { id: "c", status: "open" },
  ] };
  const results = [
    { id: "a", status: "fixed", severity: "P0", title: "A" },
    { id: "b", status: "open", severity: "P1", title: "B" },
    { id: "c", status: "open", severity: "P2", title: "C" },
  ];
  const diff = ra.diffBaseline(results, baseline);
  assert.deepEqual(diff.closed.map((r) => r.id), ["a"]);
  assert.deepEqual(diff.regressed.map((r) => r.id), ["b"]);
  assert.deepEqual(diff.remaining.map((r) => r.id), ["c"]);
});

test("renderReport и saveReport пишут безопасный отчёт в мозг", () => {
  const res = {
    date: "2026-11-24", name: "unit", root: tmp,
    git: { branch: "main", lastCommit: "abc123 test" },
    summary: { total: 1, fixed: 0, open: 1, mixed: 0, uncertain: 0, missing: 0, manual: 0 },
    baseline: path.join(tmp, "baseline.json"), baselineCreated: false,
    diff: { closed: [], regressed: [], remaining: [{ id: "x", severity: "P0", title: "X" }] },
    results: [{ status: "open", severity: "P0", id: "x", title: "X", evidence: ["OPEN svc.ts:1: apiKey=[REDACTED]"] }],
  };
  const text = ra.renderReport(res);
  assert.match(text, /# Re-audit unit/);
  assert.match(text, /Закрыто относительно базы/);
  assert.doesNotMatch(text, /abcdefgh12345678/);
  const out = ra.saveReport(res);
  assert.equal(fs.existsSync(out), true);
  assert.equal(fs.readFileSync(out, "utf8"), text);
});
