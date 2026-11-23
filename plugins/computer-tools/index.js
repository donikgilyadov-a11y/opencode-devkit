import path from "node:path";
import fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { Plugin } from "@opencode/plugin";

const run = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PS = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const INPUT = path.join(HERE, "ps", "input.ps1");
const SHOT = path.join(HERE, "ps", "screenshot.ps1");
const SHOTS = path.join(
  process.env.USERPROFILE || process.env.HOME,
  "Desktop",
  "opencode-boost",
  "computer",
  "screenshots"
);

async function powershell(script, params = []) {
  const args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, ...params];
  try {
    const { stdout, stderr } = await run(PS, args, { maxBuffer: 12 * 1024 * 1024 });
    const text = stdout.trim();
    if (stderr && stderr.trim()) {
      return { content: `${text}\n${stderr.trim()}` };
    }
    return { content: text || "OK" };
  } catch (e) {
    const detail = (e.stderr || e.stdout || e.message || "").trim();
    return { content: `Ошибка computer-use: ${detail}` };
  }
}

function arg(name, value) {
  return [`-${name}`, String(value)];
}

export default Plugin.define({
  id: "computer-tools",
  async setup(ctx) {
    const codeOpts = { namespace: "computer", codemode: true };

    await ctx.tool.transform((editor) => {
      editor.namespace({
        name: "computer",
        description: "Computer use на Windows: скриншот, мышь, клавиатура, окна",
      });

      editor.add({
        name: "info",
        description: "Показать размер экрана, происхождение координат и заголовок активного окна.",
        input: { type: "object", properties: {}, additionalProperties: false },
        options: codeOpts,
        execute: async () => powershell(INPUT, arg("Action", "info")),
      });

      editor.add({
        name: "screenshot",
        description: "Снять скриншот всего экрана и сохранить PNG. Без path — в ~/Desktop/opencode-boost/computer/screenshots/.",
        input: {
          type: "object",
          properties: {
            path: { type: "string", description: "Куда сохранить PNG (необязательно)" },
          },
          additionalProperties: false,
        },
        options: codeOpts,
        execute: async (input) => {
          let target = input.path;
          if (!target) {
            fs.mkdirSync(SHOTS, { recursive: true });
            const stamp = new Date().toISOString().replace(/[:.]/g, "-");
            target = path.join(SHOTS, `screen-${stamp}.png`);
          }
          return powershell(SHOT, arg("Path", path.resolve(target)));
        },
      });

      editor.add({
        name: "move",
        description: "Переместить курсор в координаты X, Y (в пикселях экрана).",
        input: {
          type: "object",
          properties: {
            x: { type: "number", description: "Координата X" },
            y: { type: "number", description: "Координата Y" },
          },
          required: ["x", "y"],
          additionalProperties: false,
        },
        options: codeOpts,
        execute: async (input) =>
          powershell(INPUT, [...arg("Action", "move"), ...arg("X", input.x), ...arg("Y", input.y)]),
      });

      editor.add({
        name: "click",
        description: "Кликнуть мышью по координатам. Кнопка left/right/middle, двойной клик double=true.",
        input: {
          type: "object",
          properties: {
            x: { type: "number", description: "Координата X" },
            y: { type: "number", description: "Координата Y" },
            button: { type: "string", description: "left|right|middle, по умолчанию left" },
            double: { type: "boolean", description: "Двойной клик" },
          },
          required: ["x", "y"],
          additionalProperties: false,
        },
        options: codeOpts,
        execute: async (input) =>
          powershell(INPUT, [
            ...arg("Action", "click"),
            ...arg("X", input.x),
            ...arg("Y", input.y),
            ...arg("Button", input.button || "left"),
            ...arg("Double", input.double ? "1" : "0"),
          ]),
      });

      editor.add({
        name: "type",
        description: "Ввести текст в активное поле через буфер обмена (Ctrl+V). Поддерживает кириллицу.",
        input: {
          type: "object",
          properties: {
            text: { type: "string", description: "Текст для ввода" },
          },
          required: ["text"],
          additionalProperties: false,
        },
        options: codeOpts,
        execute: async (input) => powershell(INPUT, [...arg("Action", "type"), ...arg("Text", input.text)]),
      });

      editor.add({
        name: "key",
        description: "Нажать одну клавишу: Enter, Escape, Tab, ArrowUp, F5, a и т.д.",
        input: {
          type: "object",
          properties: {
            key: { type: "string", description: "Имя клавиши" },
          },
          required: ["key"],
          additionalProperties: false,
        },
        options: codeOpts,
        execute: async (input) => powershell(INPUT, [...arg("Action", "key"), ...arg("Key", input.key)]),
      });

      editor.add({
        name: "hotkey",
        description: "Сочетание клавиш, например keys=[\"Ctrl\",\"Shift\",\"S\"] или [\"Alt\",\"F4\"].",
        input: {
          type: "object",
          properties: {
            keys: { type: "array", items: { type: "string" }, description: "Модификаторы и клавиша" },
          },
          required: ["keys"],
          additionalProperties: false,
        },
        options: codeOpts,
        execute: async (input) =>
          powershell(INPUT, [...arg("Action", "hotkey"), ...arg("Keys", (input.keys || []).join(","))]),
      });

      editor.add({
        name: "scroll",
        description: "Прокрутить колесо мыши: положительное число — вверх, отрицательное — вниз.",
        input: {
          type: "object",
          properties: {
            amount: { type: "number", description: "Шаги прокрутки" },
          },
          required: ["amount"],
          additionalProperties: false,
        },
        options: codeOpts,
        execute: async (input) =>
          powershell(INPUT, [...arg("Action", "scroll"), ...arg("Amount", input.amount)]),
      });

      editor.add({
        name: "windows",
        description: "Список видимых окон: handle, pid, процесс, прямоугольник, заголовок.",
        input: { type: "object", properties: {}, additionalProperties: false },
        options: codeOpts,
        execute: async () => powershell(INPUT, arg("Action", "windows")),
      });

      editor.add({
        name: "activate",
        description: "Активировать окно по handle или по подстроке заголовка title.",
        input: {
          type: "object",
          properties: {
            handle: { type: "number", description: "Handle окна из computer.windows" },
            title: { type: "string", description: "Подстрока заголовка окна" },
          },
          additionalProperties: false,
        },
        options: codeOpts,
        execute: async (input) => {
          const params = [...arg("Action", "activate"), ...arg("Handle", input.handle || 0), ...arg("Title", input.title || "")];
          return powershell(INPUT, params);
        },
      });
    });
  },
});
