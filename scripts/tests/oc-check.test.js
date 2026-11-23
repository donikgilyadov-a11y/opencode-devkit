const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { readJsonc, count } = require("../oc-check.js");

let tmp;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "boost-occheck-"));
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("readJsonc игнорирует комментарии, в том числе внутри URL", () => {
  const file = path.join(tmp, "opencode.jsonc");
  fs.writeFileSync(
    file,
    '{\n  "$schema": "https://opencode.ai/config.json", // комментарий\n  "plugins": ["a", "b",], /* блок */\n}\n',
    "utf8"
  );
  const cfg = readJsonc(file);
  assert.equal(cfg.$schema, "https://opencode.ai/config.json");
  assert.deepEqual(cfg.plugins, ["a", "b"]);
  assert.ok(!cfg.__error);
});

test("readJsonc возвращает __error для битого JSON", () => {
  const file = path.join(tmp, "bad.jsonc");
  fs.writeFileSync(file, "{ bad json", "utf8");
  assert.ok(readJsonc(file).__error);
});

test("count считает файлы и папки", () => {
  fs.writeFileSync(path.join(tmp, "a.md"), "a", "utf8");
  fs.writeFileSync(path.join(tmp, "b.md"), "b", "utf8");
  fs.writeFileSync(path.join(tmp, "c.js"), "c", "utf8");
  fs.mkdirSync(path.join(tmp, "dir"));
  assert.equal(count(tmp, ".md"), 2);
  assert.equal(count(tmp, null, "dir"), 1);
});
