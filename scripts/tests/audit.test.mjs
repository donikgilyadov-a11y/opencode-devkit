import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { auditRepo, renderReport, saveReport } from "../audit-core.mjs";

let tmp;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "boost-audit-"));
  fs.writeFileSync(path.join(tmp, "README.md"), "# Тестовый репо\n", "utf8");
  fs.writeFileSync(
    path.join(tmp, "package.json"),
    '{"name":"fixture","version":"1.0.0","scripts":{"test":"node --test"}}\n',
    "utf8"
  );
  fs.mkdirSync(path.join(tmp, "src"));
  fs.writeFileSync(path.join(tmp, "src", "app.js"), "// TODO: починить\nconst x = 1;\n", "utf8");
  fs.writeFileSync(path.join(tmp, "config.md"), 'api_key = "abcdefgh12345678"\n', "utf8");
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("auditRepo собирает структуру, не сохраняя значения секретов", () => {
  const a = auditRepo(tmp, { name: "fixture" });
  assert.equal(a.name, "fixture");
  assert.equal(a.heading, "Тестовый репо");
  assert.equal(a.markers.package, true);
  assert.equal(a.markers.tests, false);
  assert.equal(a.pkg.name, "fixture");
  assert.ok(a.todos >= 1);
  assert.ok(a.secretHits.some((h) => h.includes("(значение скрыто)")));
  assert.ok(!JSON.stringify(a).includes("abcdefgh12345678"));
});

test("renderReport и saveReport пишут безопасный отчёт", () => {
  const a = auditRepo(tmp, { name: "fixture" });
  const report = renderReport(a);
  assert.match(report, /# Аудит репозитория fixture/);
  assert.match(report, /config\.md:1 \(значение скрыто\)/);
  assert.ok(!report.includes("abcdefgh12345678"));

  const out = saveReport(a, path.join(tmp, "brain"));
  assert.ok(fs.existsSync(out));
  assert.match(path.basename(out), /^repo-audit-fixture-\d{4}-\d{2}-\d{2}\.md$/);
  assert.equal(fs.readFileSync(out, "utf8"), report);
});

test("auditRepo отвергает несуществующую папку", () => {
  assert.throws(() => auditRepo(path.join(tmp, "нет")), /Папка не найдена/);
});
