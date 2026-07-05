import { prisma } from "@/lib/db";
import { ResumeList } from "./resume-list";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const resumes = await prisma.resumeVersion.findMany({ orderBy: { title: "asc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Настройки</h1>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="mb-2 font-semibold">Поиск вакансий и hh.ru</h2>
        <p className="text-sm text-zinc-600">
          API соискателей hh (авторизация, автоотклики, синхронизация статусов) закрыт
          15 декабря 2025. Остаётся публичный поиск вакансий — он работает без авторизации.
          Откликаешься на hh.ru вручную, а сюда заносишь отклик в журнал: так копится аналитика
          воронки, а Claude на дашборде подсказывает, что улучшить.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="mb-2 font-semibold">Генерация писем (терминальный Claude)</h2>
        <p className="text-sm text-zinc-600">
          Письма и советы коуча генерирует установленный Claude Code (<code>claude -p</code>) по твоей
          подписке — API-ключ не нужен. Если CLI недоступен, для писем используется шаблон.
          Одно письмо занимает ~15–60 секунд.
        </p>
      </div>

      <ResumeList initial={resumes.map((r) => ({ id: r.id, title: r.title, role: r.role }))} />
    </div>
  );
}
