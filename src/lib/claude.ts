import { spawn } from "child_process";

// Единая точка вызова терминального Claude Code (headless: `claude -p`).
// Работает по подписке — API-ключ не нужен. Возвращает null, если CLI недоступен,
// упал, вышел за таймаут или вернул слишком короткий ответ.
export function runClaude(
  prompt: string,
  opts: { minLength?: number; timeoutMs?: number } = {}
): Promise<string | null> {
  const minLength = opts.minLength ?? 1;
  const timeoutMs = opts.timeoutMs ?? 180_000;

  return new Promise((resolve) => {
    // shell:true нужен на Windows (claude — это .cmd-шим); аргументы статичные,
    // сам промпт уходит через stdin, инъекция невозможна.
    const child = spawn("claude", ["-p", "--output-format", "text"], {
      shell: true,
      windowsHide: true,
    });
    let out = "";
    const timer = setTimeout(() => {
      child.kill();
      resolve(null);
    }, timeoutMs);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", () => {});
    child.on("close", (code) => {
      clearTimeout(timer);
      const text = out.trim();
      resolve(code === 0 && text.length >= minLength ? text : null);
    });
    child.on("error", () => {
      clearTimeout(timer);
      resolve(null);
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}
