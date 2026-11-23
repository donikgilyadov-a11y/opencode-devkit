const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "oc-doctor-"));
process.env.OPENCODE_DOCTOR_BACKUP_ROOT = path.join(tmpRoot, "backups");
const doctor = require("../oc-doctor");

test("slug ведёт себя как kebab-case", () => {
  assert.equal(doctor.slug("Admin Panel"), "admin-panel");
  assert.equal(doctor.slug("Мой Навык!"), "мой-навык");
  assert.equal(doctor.slug("  --OK--  "), "ok");
  assert.equal(doctor.slug(""), "skill");
});

test("parseFrontmatter читает только первый блок", () => {
  const text = "---\nname: old\ndescription: x\n---\n\n$ARGUMENTS";
  const fm = doctor.parseFrontmatter(text);
  assert.ok(fm);
  assert.match(fm.body, /^name: old$/m);
  assert.match(fm.raw, /^---$/m);
  assert.equal(doctor.parseFrontmatter("без фронтматтера"), null);
});

test("replaceTokens подставляет домашнюю папку", () => {
  const home = process.env.USERPROFILE || os.homedir();
  assert.equal(doctor.replaceTokens("<HOME>/a"), `${home.replace(/\\/g, "/")}/a`);
  assert.equal(doctor.replaceTokens("%USERPROFILE%/b"), `${home}/b`);
});

test("writeText пишет файл и делает бэкап", () => {
  const file = path.join(tmpRoot, "nested", "note.txt");
  assert.equal(doctor.writeText(file, "один"), "новый файл");
  assert.match(doctor.writeText(file, "два"), /бэкап:/);
  assert.equal(fs.readFileSync(file, "utf8"), "два");
  const backups = fs.readdirSync(process.env.OPENCODE_DOCTOR_BACKUP_ROOT, { recursive: true });
  assert.ok(backups.some((p) => String(p).endsWith("note.txt")));
});

test("skillFixes чинит name: и литерал $ARGUMENTS", async () => {
  const skills = path.join(tmpRoot, "skills", "My Skill");
  fs.mkdirSync(skills, { recursive: true });
  const file = path.join(skills, "SKILL.md");
  fs.writeFileSync(file,
    "---\nname: Красивое Имя\ndescription: тест\n---\n\n# Заголовок\n\nСделай $ARGUMENTS.\n", "utf8");

  const actions = [];
  doctor.skillFixes(path.join(tmpRoot, "skills"), (id, title, severity, detail, fix) =>
    actions.push({ id, title, severity, detail, fix }));

  assert.equal(actions.length, 2);
  for (const a of actions) {
    assert.equal(a.severity, "auto");
    assert.match(await a.fix(), /бэкап:/);
  }
  const text = fs.readFileSync(file, "utf8");
  assert.match(text, /^name: my-skill$/m);
  assert.ok(!text.includes("$ARGUMENTS"));
  assert.match(text, /Сделай то, что просит пользователь\./);
});
