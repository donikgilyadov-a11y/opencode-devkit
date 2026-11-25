#!/usr/bin/env node
'use strict';

// Лёгкий линтер локальных навыков OpenCode. Только читает файлы.
// Использование: node scripts/skill-lint.js [папка-skills] [--json]

const fs = require('fs');
const path = require('path');

const ROOT = process.env.OPENCODE_SKILLS_DIR
  || process.argv.slice(2).find((a) => !a.startsWith('--'))
  || path.join(__dirname, '..', 'skills');
const JSON_OUT = process.argv.includes('--json');

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STRAY = /[\u3400-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF\u0600-\u06FF]/;

function parseFrontmatter(text) {
  text = text.replace(/^\uFEFF/, '');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return { ok: false, name: '', description: '', body: text };
  const fm = m[1];
  const body = text.slice(m[0].length);
  const name = (fm.match(/^name:\s*(.+)$/m) || [])[1] || '';
  const dm = fm.match(/^description:\s*([^\r\n]*)(?:\r?\n([ \t]+[^\r\n]*))* /m)
    || fm.match(/^description:\s*([^\r\n]*)/m);
  let description = dm ? (dm[1] || '').trim() : '';
  if (dm && dm[2]) description = [description, dm[2].trim()].filter(Boolean).join(' ');
  description = description.replace(/^['"]|['"]$/g, '').trim();
  return {
    ok: true,
    name: name.replace(/^['"]|['"]$/g, '').trim(),
    description,
    body,
  };
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name === 'SKILL.md') out.push(p);
  }
  return out;
}

function lint() {
  const files = walk(ROOT);
  const findings = [];
  const descriptions = new Map();
  const rootAttributions = fs.readdirSync(ROOT)
    .filter((f) => /ATTRIBUTION|NOTES/i.test(f) && f.endsWith('.md'));

  for (const file of files) {
    const dir = path.relative(ROOT, path.dirname(file)).replace(/\\/g, '/');
    const id = dir.split('/').pop();
    const text = fs.readFileSync(file, 'utf8');
    const fm = parseFrontmatter(text);
    const add = (severity, code, detail) => findings.push({ severity, code, skill: dir, detail });

    if (!fm.ok) add('error', 'FRONTMATTER_MISSING', 'нет блока frontmatter');
    if (!KEBAB.test(id)) add('error', 'DIR_NOT_KEBAB', `имя папки не kebab-case: ${id}`);
    if (!fm.name) add('error', 'NAME_MISSING', 'нет поля name');
    else if (fm.name !== id) add('error', 'NAME_MISMATCH', `name=${fm.name}, папка=${id}`);
    if (!fm.description || fm.description.length < 20) add('error', 'DESCRIPTION_SHORT', 'описание отсутствует или короче 20 символов');
    if (!/^#\s+\S/m.test(fm.body)) add('error', 'H1_MISSING', 'нет заголовка первого уровня после frontmatter');
    if (fm.body.includes('$ARGUMENTS')) add('error', 'LITERAL_ARGUMENTS', 'буквальный $ARGUMENTS в тексте навыка');
    if (STRAY.test(text)) add('error', 'STRAY_CHARS', 'обнаружены посторонние CJK/арабские/корейские символы');

    const norm = fm.description.toLowerCase().replace(/[^a-zа-я0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90);
    if (norm) {
      if (!descriptions.has(norm)) descriptions.set(norm, []);
      descriptions.get(norm).push(dir);
    }
    if (rootAttributions.length === 0) add('warning', 'ATTRIBUTION_MISSING', 'в skills/ нет файла атрибуции');
  }

  for (const [norm, list] of descriptions) {
    if (list.length > 1) {
      for (const skill of list) findings.push({ severity: 'warning', code: 'DUPLICATE_DESCRIPTION', skill, detail: norm });
    }
  }

  const errors = findings.filter((f) => f.severity === 'error').length;
  const warnings = findings.length - errors;
  return { root: ROOT, skills: files.length, errors, warnings, findings: findings.sort((a, b) => a.skill.localeCompare(b.skill)) };
}

const result = lint();
if (JSON_OUT) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`SKILL LINT: skills=${result.skills} errors=${result.errors} warnings=${result.warnings}`);
  for (const f of result.findings) console.log(`${f.severity.toUpperCase()} ${f.code} ${f.skill}: ${f.detail}`);
}
process.exit(result.errors ? 1 : 0);

module.exports = { lint, parseFrontmatter, walk };
