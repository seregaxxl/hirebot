"use client";

import { useMemo, useState } from "react";
import { OUTREACH_STAGES } from "@/lib/outreach";

type Outreach = {
  id: number;
  company: string;
  contactName: string | null;
  contactRole: string | null;
  contactLink: string | null;
  domain: string | null;
  channel: string | null;
  stage: string;
  letter: string | null;
  notes: string | null;
};

const CLOSED = ["WON", "LOST"];

export function OutreachBoard({
  initialItems,
  initialCases,
}: {
  initialItems: Outreach[];
  initialCases: string;
}) {
  const [items, setItems] = useState<Outreach[]>(initialItems);
  const [cases, setCases] = useState(initialCases);
  const [casesSaved, setCasesSaved] = useState(false);
  const [showCases, setShowCases] = useState(!initialCases);
  const [lang, setLang] = useState<"en" | "ru">("en");

  // форма добавления
  const [f, setF] = useState({ company: "", contactName: "", contactRole: "", contactLink: "", domain: "", channel: "LinkedIn" });

  // состояние генерации/раскрытия письма по id
  const [busyId, setBusyId] = useState<number | null>(null);
  const [openLetter, setOpenLetter] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const summary = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) m.set(it.stage, (m.get(it.stage) ?? 0) + 1);
    return m;
  }, [items]);
  const active = items.filter((i) => !CLOSED.includes(i.stage)).length;

  async function saveCases() {
    await fetch("/api/outreach/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cases }),
    });
    setCasesSaved(true);
    setTimeout(() => setCasesSaved(false), 2000);
  }

  async function add() {
    if (!f.company.trim()) return;
    const res = await fetch("/api/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    const data = await res.json();
    if (res.ok) {
      setItems((prev) => [data, ...prev]);
      setF({ company: "", contactName: "", contactRole: "", contactLink: "", domain: "", channel: "LinkedIn" });
    }
  }

  async function patch(id: number, patch: Partial<Outreach>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    await fetch(`/api/outreach/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async function remove(id: number) {
    setItems((prev) => prev.filter((it) => it.id !== id));
    await fetch(`/api/outreach/${id}`, { method: "DELETE" });
  }

  async function genLetter(id: number) {
    setBusyId(id);
    setError("");
    setOpenLetter(id);
    try {
      const res = await fetch(`/api/outreach/${id}/letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Ошибка генерации");
      else setItems((prev) => prev.map((it) => (it.id === id ? { ...it, letter: data.letter } : it)));
    } finally {
      setBusyId(null);
    }
  }

  const input = "rounded border border-zinc-300 px-3 py-2 text-sm";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Аутрич</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Прямые письма основателям и Head of Product как в CRM: контакт, этап, письмо, заметки.
          Самый конверсионный канал — не теряй ни одного контакта.
        </p>
      </div>

      {/* Мои кейсы */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <button onClick={() => setShowCases((s) => !s)} className="flex w-full items-center justify-between text-left">
          <span className="font-semibold">Мои кейсы {cases ? "" : "— заполни, чтобы письма были персональными"}</span>
          <span className="text-zinc-400">{showCases ? "▲" : "▼"}</span>
        </button>
        {showCases && (
          <div className="mt-3">
            <p className="mb-2 text-sm text-zinc-500">
              2–4 ключевых кейса с цифрами (общий контекст для всех писем). Например: «Запустил X, вырос
              retention с A% до B%», «Собрал команду из N, сократил time-to-market на M%».
            </p>
            <textarea
              value={cases}
              onChange={(e) => setCases(e.target.value)}
              rows={6}
              placeholder="— Кейс 1: ...&#10;— Кейс 2: ..."
              className="w-full rounded border border-zinc-300 p-2 text-sm"
            />
            <button
              onClick={saveCases}
              className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700"
            >
              {casesSaved ? "Сохранено ✓" : "Сохранить кейсы"}
            </button>
          </div>
        )}
      </div>

      {/* Сводка по этапам */}
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-zinc-900 px-3 py-1 text-white">Активных: {active}</span>
        {OUTREACH_STAGES.map(([id, label]) => (
          <span key={id} className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-600">
            {label}: {summary.get(id) ?? 0}
          </span>
        ))}
      </div>

      {/* Добавить компанию */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">Добавить компанию в аутрич</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <input value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} placeholder="Компания *" className={input} />
          <input value={f.domain} onChange={(e) => setF({ ...f, domain: e.target.value })} placeholder="Домен (devtools, финтех…)" className={input} />
          <input value={f.contactName} onChange={(e) => setF({ ...f, contactName: e.target.value })} placeholder="Имя контакта" className={input} />
          <input value={f.contactRole} onChange={(e) => setF({ ...f, contactRole: e.target.value })} placeholder="Роль (Founder, Head of Product)" className={input} />
          <input value={f.contactLink} onChange={(e) => setF({ ...f, contactLink: e.target.value })} placeholder="LinkedIn / email" className={input} />
          <select value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value })} className={input}>
            <option>LinkedIn</option>
            <option>Email</option>
            <option>Telegram</option>
            <option>X / Twitter</option>
          </select>
        </div>
        <button
          onClick={add}
          disabled={!f.company.trim()}
          className="mt-3 rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          Добавить
        </button>
      </div>

      {/* Язык писем */}
      <div className="flex items-center gap-2 text-sm text-zinc-600">
        Язык писем:
        <select value={lang} onChange={(e) => setLang(e.target.value as "en" | "ru")} className="rounded border border-zinc-300 px-2 py-1">
          <option value="en">English</option>
          <option value="ru">Русский</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Список */}
      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.id} className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{it.company}</span>
                  {it.domain && <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600">{it.domain}</span>}
                </div>
                <div className="text-sm text-zinc-500">
                  {[it.contactName, it.contactRole].filter(Boolean).join(" · ") || "контакт не указан"}
                  {it.channel && ` · ${it.channel}`}
                  {it.contactLink && (
                    <>
                      {" · "}
                      <a href={it.contactLink.startsWith("http") ? it.contactLink : `https://${it.contactLink}`} target="_blank" className="text-blue-600 hover:underline">
                        ссылка ↗
                      </a>
                    </>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-sm">
                <select
                  value={it.stage}
                  onChange={(e) => patch(it.id, { stage: e.target.value })}
                  className="rounded border border-zinc-300 px-2 py-1"
                >
                  {OUTREACH_STAGES.map(([id, label]) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
                <button
                  onClick={() => genLetter(it.id)}
                  disabled={busyId === it.id}
                  className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {busyId === it.id ? "Пишу…" : it.letter ? "Письмо ✎" : "Письмо"}
                </button>
                <button onClick={() => remove(it.id)} className="rounded border border-zinc-300 px-2 py-1 text-red-600 hover:bg-red-50">
                  Удалить
                </button>
              </div>
            </div>

            {/* Письмо */}
            {(openLetter === it.id || it.letter) && (
              <div className="mt-3 border-t border-zinc-100 pt-3">
                {busyId === it.id && <p className="text-sm text-zinc-500">Claude пишет письмо (до минуты)…</p>}
                {it.letter && busyId !== it.id && (
                  <>
                    <textarea
                      value={it.letter}
                      onChange={(e) => setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, letter: e.target.value } : x)))}
                      onBlur={(e) => patch(it.id, { letter: e.target.value })}
                      rows={8}
                      className="w-full rounded border border-zinc-300 p-2 text-sm"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(it.letter ?? "");
                          setCopiedId(it.id);
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-500"
                      >
                        {copiedId === it.id ? "Скопировано ✓" : "Скопировать"}
                      </button>
                      <button onClick={() => genLetter(it.id)} className="rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50">
                        Перегенерировать
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Заметки */}
            <textarea
              defaultValue={it.notes ?? ""}
              onBlur={(e) => patch(it.id, { notes: e.target.value })}
              rows={1}
              placeholder="Заметки: когда написал, что ответили, следующий шаг…"
              className="mt-3 w-full rounded border border-zinc-200 bg-zinc-50 p-2 text-sm"
            />
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-zinc-500">Пока пусто. Добавь первую компанию выше и напиши основателю.</p>
        )}
      </div>
    </div>
  );
}
