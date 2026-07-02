import { isHhConnected } from "@/lib/hh";
import { prisma } from "@/lib/db";
import { ResumeList } from "./resume-list";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const connected = await isHhConnected();
  const resumes = await prisma.resumeVersion.findMany({ orderBy: { title: "asc" } });
  const envReady = Boolean(process.env.HH_CLIENT_ID && process.env.HH_CLIENT_SECRET);
  const redirectUri = process.env.HH_REDIRECT_URI ?? "";
  const redirectIsLocal = redirectUri.includes("localhost");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Настройки</h1>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="mb-2 font-semibold">Подключение hh.ru</h2>
        {(!envReady || redirectIsLocal) && (
          <div className="mb-3 rounded bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-medium">Настройка (hh не принимает localhost как Redirect URI — нужен ngrok):</p>
            <ol className="mt-1 list-inside list-decimal space-y-1">
              <li>Установи ngrok (<a href="https://ngrok.com/download" target="_blank" className="underline">ngrok.com/download</a>), залогинься: <code>ngrok config add-authtoken &lt;токен&gt;</code></li>
              <li>Запусти туннель: <code>ngrok http 3000</code> — получишь адрес вида <code>https://xxxx.ngrok-free.app</code></li>
              <li>На <a href="https://dev.hh.ru/admin" target="_blank" className="underline">dev.hh.ru/admin</a> создай приложение, Redirect URI: <code>https://xxxx.ngrok-free.app/api/auth/hh/callback</code></li>
              <li>В <code>.env</code>: Client ID, Client Secret и тот же <code>HH_REDIRECT_URI</code></li>
              <li>Перезапусти <code>npm run dev</code> и жми «Подключить hh.ru» (можно прямо с localhost — через ngrok пройдёт только callback)</li>
            </ol>
            <p className="mt-1 text-xs">Текущий HH_REDIRECT_URI: <code>{redirectUri || "не задан"}</code></p>
          </div>
        )}
        <p className="mb-3 text-sm">
          Статус:{" "}
          {connected ? (
            <span className="font-medium text-green-600">подключено ✅</span>
          ) : (
            <span className="font-medium text-red-500">не подключено</span>
          )}
        </p>
        <a
          href="/api/auth/hh"
          className="inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700"
        >
          {connected ? "Переподключить hh.ru" : "Подключить hh.ru"}
        </a>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="mb-2 font-semibold">Генерация писем (терминальный Claude)</h2>
        <p className="text-sm text-zinc-600">
          Письма генерирует установленный Claude Code (<code>claude -p</code>) по твоей подписке — API-ключ не нужен.
          Если CLI недоступен, бот молча падает на шаблон. Одно письмо занимает ~15–60 секунд, для массового
          автоотклика можно выбрать быстрый режим «шаблон».
        </p>
      </div>

      <ResumeList initial={resumes.map((r) => ({ id: r.id, title: r.title, role: r.role }))} />
    </div>
  );
}
