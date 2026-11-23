const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const BRAIN_JS = path.join(__dirname, "..", "brain.js");
let tmp;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "boost-brain-"));
  fs.mkdirSync(path.join(tmp, "memory"), { recursive: true });
  fs.writeFileSync(path.join(tmp, "MEMORY.md"), "# Memory\n\n[[memory/LONG_TERM]] #память\n", "utf8");
  fs.writeFileSync(path.join(tmp, "memory", "LONG_TERM.md"), "# Long\n", "utf8");
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

function run(args) {
  return execFileSync(process.execPath, [BRAIN_JS, ...args], {
    encoding: "utf8",
    env: { ...process.env, OPENCODE_BRAIN: tmp },
  });
}

test("save пишет в дневник и, с --long, в LONG_TERM", () => {
  const out = run(["save", "тест", "УНИКАЛЬНЫЙ_МАРКЕР", "--long"]);
  assert.match(out, /Записано в/);
  assert.match(out, /долгосрочную память/);

  const dailyDir = path.join(tmp, "memory");
  const daily = fs.readdirSync(dailyDir).filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f));
  assert.equal(daily.length, 1);
  const text = fs.readFileSync(path.join(dailyDir, daily[0]), "utf8");
  assert.match(text, /- \[\d{2}:\d{2}\] тест — УНИКАЛЬНЫЙ_МАРКЕР/);
  assert.match(fs.readFileSync(path.join(dailyDir, "LONG_TERM.md"), "utf8"), /УНИКАЛЬНЫЙ_МАРКЕР/);
});

test("find, tags, links и index читают временный мозг", () => {
  fs.writeFileSync(
    path.join(tmp, "note.md"),
    "# Заметка\n\nТут [[memory/LONG_TERM]] и тег #тест.\n",
    "utf8"
  );

  const found = run(["find", "УНИКАЛЬНЫЙ_МАРКЕР"]);
  assert.doesNotThrow(() => run(["save", "поиск", "УНИКАЛЬНЫЙ_МАРКЕР"]));
  assert.match(run(["find", "УНИКАЛЬНЫЙ_МАРКЕР"]), /УНИКАЛЬНЫЙ_МАРКЕР/);
  assert.match(run(["find", "ЗАПРОС_НЕ_НАЙДЕН_12345"]), /Найдено: 0/);
  assert.ok(found);

  assert.match(run(["tags", "тест"]), /#тест/);
  assert.match(run(["links", "LONG_TERM"]), /\[\[memory\/LONG_TERM\]\]/);
  assert.match(run(["index"]), /# Memory/);
});
