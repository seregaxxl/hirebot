import { prisma } from "@/lib/db";
import { computeStats, type Breakdown } from "@/lib/analytics";
import { getCachedAdvice } from "@/lib/coach";
import { StageSelect } from "./stage-select";
import { CoachPanel } from "./coach-panel";

export const dynamic = "force-dynamic";

function BreakdownCard({ title, rows }: { title: string; rows: Breakdown[] }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="mb-2 font-semibold">{title}</h2>
      {rows.map((r) => (
        <div
          key={r.key}
          className="flex justify-between border-b border-zinc-100 py-1 text-sm last:border-0"
        >
          <span>{r.key}</span>
          <span>
            {r.invited}/{r.total} → {r.rate}%
          </span>
        </div>
      ))}
    </div>
  );
}

export default async function Dashboard() {
  const apps = await prisma.application.findMany({
    include: { vacancy: true, resume: true },
    orderBy: { sentAt: "desc" },
  });

  const stats = computeStats(apps);
  const cached = await getCachedAdvice();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Воронка</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.funnel.map((f) => (
          <div key={f.label} className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="text-3xl font-bold">{f.value}</div>
            <div className="text-sm text-zinc-500">{f.label}</div>
            {f.conv != null && <div className="text-xs text-zinc-400">конверсия {f.conv}%</div>}
          </div>
        ))}
      </div>

      <CoachPanel initialAdvice={cached?.advice ?? null} initialAt={cached?.at ?? null} />

      {(stats.byRole.length > 1 || stats.byResume.length > 1 || stats.bySource.length > 1) && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.byRole.length > 1 && <BreakdownCard title="Роль: что конвертит" rows={stats.byRole} />}
          {stats.byResume.length > 1 && (
            <BreakdownCard title="Резюме: что конвертит" rows={stats.byResume} />
          )}
          {stats.bySource.length > 1 && (
            <BreakdownCard title="Письма: что конвертит" rows={stats.bySource} />
          )}
        </div>
      )}

      <div>
        <h2 className="mb-2 text-lg font-semibold">Отклики</h2>
        {apps.length === 0 ? (
          <p className="text-zinc-500">
            Пока пусто. Найди вакансии на вкладке «Вакансии» и заноси отклики в журнал.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Вакансия</th>
                  <th className="px-3 py-2">Компания</th>
                  <th className="px-3 py-2">Резюме</th>
                  <th className="px-3 py-2">Письмо</th>
                  <th className="px-3 py-2">Статус</th>
                  <th className="px-3 py-2">Отправлен</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => (
                  <tr key={a.id} className="border-t border-zinc-100">
                    <td className="px-3 py-2">
                      <a href={a.vacancy.url} target="_blank" className="text-blue-600 hover:underline">
                        {a.vacancy.name}
                      </a>
                    </td>
                    <td className="px-3 py-2">{a.vacancy.employerName}</td>
                    <td className="px-3 py-2">{a.resume.title}</td>
                    <td className="px-3 py-2">{a.letterSource === "LLM" ? "LLM" : "шаблон"}</td>
                    <td className="px-3 py-2">
                      <StageSelect id={a.id} status={a.status} />
                    </td>
                    <td className="px-3 py-2 text-zinc-500">
                      {a.sentAt.toLocaleDateString("ru-RU")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
