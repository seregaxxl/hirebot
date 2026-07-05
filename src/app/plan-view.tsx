"use client";

import { useMemo, useState } from "react";
import { PLATFORM_GROUPS, CHECKLIST_GROUPS } from "@/lib/plan";

export function PlanView({ initialChecked }: { initialChecked: string[] }) {
  const [checked, setChecked] = useState<Set<string>>(new Set(initialChecked));

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      // сохраняем весь набор (fire-and-forget)
      fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked: [...next] }),
      }).catch(() => {});
      return next;
    });
  }

  const allChecklistIds = useMemo(
    () => CHECKLIST_GROUPS.flatMap((g) => g.items.map((i) => i.id)),
    []
  );
  const doneCount = allChecklistIds.filter((id) => checked.has(id)).length;
  const progress = allChecklistIds.length
    ? Math.round((doneCount / allChecklistIds.length) * 100)
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">План трудоустройства</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Каналы поиска и чеклист действий. Прогресс сохраняется автоматически.
        </p>
      </div>

      {/* Прогресс чеклиста */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold">Чеклист выполнен</span>
          <span className="text-zinc-500">
            {doneCount}/{allChecklistIds.length} · {progress}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded bg-zinc-100">
          <div className="h-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Прямой аутрич — акцент */}
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
        <h2 className="font-semibold text-amber-900">🎯 Прямой аутрич — самый эффективный канал</h2>
        <p className="mt-1 text-sm text-amber-900/90">
          Находишь компании в своих доменах (devtools, финтех, engineering analytics) и пишешь напрямую
          founder / Head of Product короткое письмо с одним релевантным кейсом. Ты уже умеешь продавать
          C-level — это тот же скилл. На EU-стартапах «PM с руками» в дефиците, конверсия в разы выше
          отклика на вакансию. Пункты — в чеклисте ниже.
        </p>
        <a
          href="/outreach"
          className="mt-3 inline-block rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
        >
          Вести аутрич как CRM →
        </a>
      </div>

      {/* Площадки */}
      <section className="space-y-6">
        <h2 className="text-lg font-semibold">Каналы поиска</h2>
        {PLATFORM_GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="font-semibold">{group.title}</h3>
            {group.subtitle && <p className="mb-2 text-sm text-zinc-500">{group.subtitle}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              {group.items.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer gap-3 rounded-lg border border-zinc-200 bg-white p-3 hover:border-zinc-300"
                >
                  <input
                    type="checkbox"
                    checked={checked.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="mt-1 h-4 w-4 shrink-0"
                  />
                  <div className="min-w-0">
                    <a
                      href={p.url}
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {p.name} ↗
                    </a>
                    <p className={`text-sm ${checked.has(p.id) ? "text-zinc-400" : "text-zinc-600"}`}>
                      {p.note}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
        <p className="text-xs text-zinc-400">
          Чекбокс у площадки = «профиль заведён». Ссылки открываются в новой вкладке.
        </p>
      </section>

      {/* Чеклист */}
      <section className="space-y-6">
        <h2 className="text-lg font-semibold">Чеклист действий</h2>
        {CHECKLIST_GROUPS.map((group) => (
          <div key={group.title} className="rounded-lg border border-zinc-200 bg-white p-4">
            <h3 className="mb-2 font-semibold">{group.title}</h3>
            <ul className="space-y-2">
              {group.items.map((item) => {
                const on = checked.has(item.id);
                return (
                  <li key={item.id}>
                    <label className="flex cursor-pointer gap-3">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(item.id)}
                        className="mt-1 h-4 w-4 shrink-0"
                      />
                      <div>
                        <span className={`text-sm ${on ? "text-zinc-400 line-through" : "text-zinc-800"}`}>
                          {item.text}
                        </span>
                        {item.hint && (
                          <span className="block text-xs text-zinc-400">{item.hint}</span>
                        )}
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
