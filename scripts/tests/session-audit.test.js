"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const sa = require("../session-audit.js");

function fixture() {
  const base = Date.now() - 60000;
  const at = (i) => new Date(base + i * 5000).toISOString();
  const lines = [];
  for (let i = 0; i < 6; i++) {
    lines.push(`timestamp=${at(i)} level=WARN run=r${i} message="worktree discovery failed" directory="%USERPROFILE%\\Desktop\\missing" error=Worktree.DirectoryUnavailableError role=server`);
  }
  for (let i = 0; i < 3; i++) {
    lines.push(`timestamp=${at(10 + i)} level=INFO run=c${i} message="cli starting"`);
  }
  lines.push(`timestamp=${at(20)} level=ERROR run=e1 message="mcp http authentication rejected" session.id=ses_abc123 error="Bearer ghp_abcdefghijklmnopqrstuvwxyz0123456789"`);
  return lines.join("\n") + "\n";
}

test("parseLine разбирает кавычки и поля", () => {
  const rec = sa.parseLine('timestamp=2026-11-24T00:00:00.000Z level=WARN message="worktree discovery failed" session.id=ses_1 step=3');
  assert.equal(rec.level, "WARN");
  assert.equal(rec.message, "worktree discovery failed");
  assert.equal(rec.session, "ses_1");
  assert.equal(rec.fields.step, "3");
});

test("normalize склеивает одинаковые сообщения с разными id и числами", () => {
  const a = sa.normalize('worktree discovery failed session ses_abc directory "C:\\Users\\x\\Desktop\\p" error=Worktree.DirectoryUnavailableError 42ms');
  const b = sa.normalize('worktree discovery failed session ses_zzz directory "C:\\Users\\x\\Desktop\\q" error=Worktree.DirectoryUnavailableError 99ms');
  assert.equal(a, b);
});

test("redact убирает токены и путь к дому", () => {
  const s = sa.redact(`Bearer ghp_abcdefghijklmnopqrstuvwxyz0123456789 at %USERPROFILE%\\Desktop\\p`);
  assert.ok(!s.includes("ghp_"));
  assert.ok(s.includes("%USERPROFILE%") || s.includes("[TOKEN]"));
});

test("analyze находит паттерн, цикл и перезапуски CLI", () => {
  const a = sa.analyze(fixture(), { all: true, logPath: "fixture.log" });
  assert.equal(a.cliStarts, 3);
  assert.equal(a.levels.WARN, 6);
  assert.equal(a.levels.ERROR, 1);
  assert.ok(a.patterns.length >= 2);
  assert.equal(a.patterns[0].message, "worktree discovery failed");
  assert.equal(a.patterns[0].count, 6);
  assert.equal(a.patterns[0].title, "Сессия открыта из отсутствующей папки");
  assert.ok(a.loops.some((l) => l.message === "worktree discovery failed" && l.in2min >= 5));
  assert.ok(a.recommendations.some((r) => r.title === "Сессия открыта из отсутствующей папки"));
  assert.ok(a.recommendations.some((r) => r.title === "Ошибка авторизации MCP"));
});

test("saveReport пишет Markdown с рекомендациями и не копирует секрет", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "session-audit-"));
  try {
    const a = sa.analyze(fixture(), { all: true, logPath: "fixture.log" });
    const file = sa.saveReport(a, tmp);
    assert.ok(fs.existsSync(file));
    assert.match(path.basename(file), /^session-audit-\d{4}-\d{2}-\d{2}\.md$/);
    const text = fs.readFileSync(file, "utf8");
    assert.match(text, /# Аудит сессий OpenCode/);
    assert.match(text, /Рекомендации: тесты, навыки, фиксы/);
    assert.match(text, /worktree discovery failed/);
    assert.ok(!text.includes("ghp_"));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
