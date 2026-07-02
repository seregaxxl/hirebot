import { prisma } from "@/lib/db";
import { SyncButton } from "./sync-button";
import { StageSelect } from "./stage-select";

export const dynamic = "force-dynamic";

function pct(part: number, total: number) {
  return total ? `${Math.round((part / total) * 100)}%` : "—";
}

export default async function Dashboard() {
  const apps = await prisma.application.findMany({
    include: { vacancy: true, resume: true },
    orderBy: { sentAt: "desc" },
  });

  const total = apps.length;
  const count = (statuses: string[]) => apps.filter((a) => statuses.includes(a.status)).length;
  const viewed = apps.filter((a) => a.viewedByEmployer || a.status !== "SENT").length;
  const invited = count(["INVITED", "SCREENING", "INTERVIEW", "FINAL", "OFFER"]);
  const interviews = count(["INTERVIEW", "FINAL", "OFFER"]);
  const offers = count(["OFFER"]);

  const funnel = [
    { label: "Откликов", value: total, conv: "" },
    { label: "Просмотрено", value: viewed, conv: pct(viewed, total) },
    { label: "Приглашений", value: invited, conv: pct(invited, total) },
    { label: "Собеседований", value: interviews, conv: pct(interviews, total) },
    { label: "Офферов", value: offers, conv: pct(offers, total) },
  ];

  // A/B: конверсия в приглашение по источнику письма
  const bySource = new Map<string, { total: number; invited: number }>();
  for (const a of apps) {
    const key = a.letterSource.startsWith("TEMPLATE") ? a.letterSource : "LLM";
    const s = bySource.get(key) ?? { total: 0, invited: 0 };
    s.total++;
    if (["INVITED", "SCREENING", "INTERVIEW", "FINAL", "OFFER"].includes(a.status)) s.invited++;
    bySource.set(key, s);
  }

  // По версиям резюме
  const byResume = new Map<string, { total: number; invited: number }>();
  for (const a of apps) {
    const s = byResume.get(a.resume.title) ?? { total: 0, invited: 0 };
    s.total++;
    if (["INVITED", "SCREENING", "INTERVIEW", "FINAL", "OFFER"].includes(a.status)) s.invited++;
    byResume.set(a.resume.title, s);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Воронка</h1>
        <SyncButton />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {funnel.map((f) => (
          <div key={f.label} className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="text-3xl font-bold">{f.value}</div>
            <div className="text-sm text-zinc-500">{f.label}</div>
            {f.conv && <div className="text-xs text-zinc-400">конверсия {f.conv}</div>}
          </div>
        ))}
      </div>

      {(bySource.size > 1 || byResume.size > 1) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {bySource.size > 1 && (
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <h2 className="mb-2 font-semibold">Письма: что конвертит</h2>
              {[...bySource.entries()].map(([src, s]) => (
                <div key={src} className="flex justify-between border-b border-zinc-100 py-1 text-sm">
                  <span>{src}</span>
                  <span>
                    {s.invited}/{s.total} → {pct(s.invited, s.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
          {byResume.size > 1 && (
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <h2 className="mb-2 font-semibold">Резюме: что конвертит</h2>
              {[...byResume.entries()].map(([title, s]) => (
                <div key={title} className="flex justify-between border-b border-zinc-100 py-1 text-sm">
                  <span>{title}</span>
                  <span>
                    {s.invited}/{s.total} → {pct(s.invited, s.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-2 text-lg font-semibold">Отклики</h2>
        {apps.length === 0 ? (
          <p className="text-zinc-500">
            Пока пусто. Подключи hh.ru в настройках и найди вакансии на вкладке «Вакансии».
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
