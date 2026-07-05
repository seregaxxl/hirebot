"use client";

import { useCallback, useEffect, useState } from "react";

type Vacancy = {
  id: string;
  name: string;
  employerName: string;
  areaName: string | null;
  salaryFrom: number | null;
  salaryTo: number | null;
  currency: string | null;
  url: string;
  score: number | null;
  hasTest: boolean;
  status: string;
};

type Resume = { id: string; title: string; role: string };
type ChecklistItem = { check: string; pass: boolean; hint: string };
type Preview = { letter: string; source: string; checklist: ChecklistItem[] };

const AREAS: [string, string][] = [
  ["", "Все регионы"],
  ["113", "Россия"],
  ["1", "Москва"],
  ["2", "Санкт-Петербург"],
  ["40", "Казахстан"],
  ["16", "Беларусь"],
];

function salaryText(v: Vacancy) {
  if (!v.salaryFrom && !v.salaryTo) return "з/п не указана";
  const from = v.salaryFrom ? `от ${v.salaryFrom.toLocaleString("ru-RU")}` : "";
  const to = v.salaryTo ? `до ${v.salaryTo.toLocaleString("ru-RU")}` : "";
  return `${from} ${to} ${v.currency ?? ""}`.trim();
}

function ScoreBadge({ score }: { score: number | null }) {
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-bold text-white ${
        (score ?? 0) >= 60 ? "bg-green-600" : (score ?? 0) >= 35 ? "bg-amber-500" : "bg-zinc-400"
      }`}
    >
      {score ?? "—"}
    </span>
  );
}

export default function VacanciesPage() {
  // поиск
  const [text, setText] = useState("продакт менеджер");
  const [role, setRole] = useState("PRODUCT");
  const [area, setArea] = useState("113");
  const [salary, setSalary] = useState("");
  const [remote, setRemote] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [message, setMessage] = useState("");

  // данные
  const [tab, setTab] = useState<"new" | "applied">("new");
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState("");

  // письмо-превью
  const [openId, setOpenId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadVacancies = useCallback(async (mode: string) => {
    const res = await fetch(`/api/vacancies?mode=${mode}`);
    setVacancies(await res.json());
  }, []);

  useEffect(() => {
    loadVacancies(tab);
  }, [tab, loadVacancies]);

  useEffect(() => {
    fetch("/api/resumes")
      .then((r) => r.json())
      .then((data: Resume[]) => {
        setResumes(data);
        if (data[0]) setSelectedResume(data[0].id);
      });
  }, []);

  async function search() {
    setSearchBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/vacancies/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, role, area, salary, remote }),
      });
      const data = await res.json();
      if (!res.ok) setMessage(data.error ?? "Ошибка поиска");
      else {
        setMessage(`Найдено ${data.found}, сохранено и оценено ${data.saved}`);
        setTab("new");
        await loadVacancies("new");
      }
    } finally {
      setSearchBusy(false);
    }
  }

  async function makeLetter(id: string) {
    setOpenId(id);
    setPreview(null);
    setCopied(false);
    setPreviewBusy(true);
    try {
      const res = await fetch(`/api/vacancies/${id}/letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: selectedResume }),
      });
      const data = await res.json();
      if (!res.ok) setMessage(data.error ?? "Ошибка генерации");
      else setPreview(data);
    } finally {
      setPreviewBusy(false);
    }
  }

  async function markApplied(id: string) {
    const res = await fetch(`/api/vacancies/${id}/mark-applied`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resumeId: selectedResume,
        letter: openId === id ? preview?.letter : undefined,
        letterSource: openId === id ? preview?.source : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Ошибка");
      return;
    }
    setMessage("Занесено в журнал ✅");
    setOpenId(null);
    setPreview(null);
    await loadVacancies(tab);
  }

  async function act(id: string, action: "skip" | "blacklist") {
    await fetch(`/api/vacancies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await loadVacancies(tab);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Вакансии</h1>

      {/* Поиск */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Поисковый запрос"
            className="rounded border border-zinc-300 px-3 py-2"
          />
          <div className="flex flex-wrap gap-3">
            <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded border border-zinc-300 px-2 py-2">
              <option value="PM">Скоринг: PM</option>
              <option value="PRODUCT">Скоринг: Product</option>
              <option value="CTO">Скоринг: CTO</option>
            </select>
            <select value={area} onChange={(e) => setArea(e.target.value)} className="rounded border border-zinc-300 px-2 py-2">
              {AREAS.map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
            <input
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder="Мин. з/п"
              className="w-28 rounded border border-zinc-300 px-3 py-2"
            />
            <label className="flex items-center gap-1 text-sm">
              <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} />
              удалёнка
            </label>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <button
            onClick={search}
            disabled={searchBusy}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {searchBusy ? "Ищу…" : "Найти и оценить"}
          </button>
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            Резюме:
            {resumes.length > 0 ? (
              <select
                value={selectedResume}
                onChange={(e) => setSelectedResume(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1"
              >
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            ) : (
              <a href="/settings" className="text-blue-600 hover:underline">
                добавь версию в настройках
              </a>
            )}
          </label>
          {message && <span className="text-sm text-zinc-500">{message}</span>}
        </div>
      </div>

      <p className="text-sm text-zinc-500">
        Отклик на hh.ru — вручную (API соискателей закрыт). Сгенерируй письмо, скопируй, откликнись
        на hh по ссылке, затем нажми «Занести в журнал» — так копится аналитика воронки.
      </p>

      {/* Вкладки */}
      <div className="flex gap-2 border-b border-zinc-200 text-sm">
        <button
          onClick={() => setTab("new")}
          className={`px-4 py-2 ${tab === "new" ? "border-b-2 border-zinc-900 font-semibold" : "text-zinc-500"}`}
        >
          Новые
        </button>
        <button
          onClick={() => setTab("applied")}
          className={`px-4 py-2 ${tab === "applied" ? "border-b-2 border-zinc-900 font-semibold" : "text-zinc-500"}`}
        >
          Откликнулся
        </button>
      </div>

      {/* Список */}
      <div className="space-y-3">
        {vacancies.map((v) => (
          <div key={v.id} className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <ScoreBadge score={v.score} />
                  <a href={v.url} target="_blank" className="font-semibold text-blue-700 hover:underline">
                    {v.name}
                  </a>
                  {v.hasTest && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">тест</span>
                  )}
                </div>
                <div className="text-sm text-zinc-500">
                  {v.employerName} · {v.areaName ?? "—"} · {salaryText(v)}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-2 text-sm">
                {tab === "new" && (
                  <>
                    <button
                      onClick={() => makeLetter(v.id)}
                      disabled={!selectedResume}
                      className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-500 disabled:opacity-40"
                    >
                      Письмо
                    </button>
                    <a
                      href={v.url}
                      target="_blank"
                      className="rounded bg-zinc-900 px-3 py-1 text-white hover:bg-zinc-700"
                    >
                      Откликнуться на hh ↗
                    </a>
                    <button
                      onClick={() => markApplied(v.id)}
                      disabled={!selectedResume}
                      className="rounded border border-green-600 px-3 py-1 text-green-700 hover:bg-green-50 disabled:opacity-40"
                    >
                      Занести в журнал
                    </button>
                    <button onClick={() => act(v.id, "skip")} className="rounded border border-zinc-300 px-3 py-1 hover:bg-zinc-50">
                      Скрыть
                    </button>
                    <button onClick={() => act(v.id, "blacklist")} className="rounded border border-zinc-300 px-3 py-1 text-red-600 hover:bg-red-50">
                      В ЧС
                    </button>
                  </>
                )}
                {tab === "applied" && (
                  <span className="rounded bg-green-100 px-2 py-1 text-green-700">в журнале ✅</span>
                )}
              </div>
            </div>

            {openId === v.id && (
              <div className="mt-4 border-t border-zinc-100 pt-4">
                {previewBusy && <p className="text-sm text-zinc-500">Генерирую письмо (через терминальный Claude, до минуты)…</p>}
                {preview && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="mb-1 text-xs text-zinc-400">
                        Источник: {preview.source} · {preview.letter.length} знаков
                      </div>
                      <textarea
                        value={preview.letter}
                        onChange={(e) => setPreview({ ...preview, letter: e.target.value })}
                        rows={12}
                        className="w-full rounded border border-zinc-300 p-2 text-sm"
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(preview.letter);
                            setCopied(true);
                          }}
                          className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-500"
                        >
                          {copied ? "Скопировано ✓" : "Скопировать письмо"}
                        </button>
                        <button
                          onClick={() => makeLetter(v.id)}
                          className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50"
                        >
                          Перегенерировать
                        </button>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-xs text-zinc-400">Чеклист письма</div>
                      <ul className="space-y-1 text-sm">
                        {preview.checklist.map((c) => (
                          <li key={c.check} className={c.pass ? "text-green-700" : "text-red-600"}>
                            {c.pass ? "✓" : "✗"} {c.check}
                            {!c.pass && <span className="block pl-4 text-xs text-zinc-500">{c.hint}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {vacancies.length === 0 && (
          <p className="text-zinc-500">
            {tab === "new" ? "Нет вакансий в очереди — запусти поиск выше." : "Пока нет откликов в журнале."}
          </p>
        )}
      </div>
    </div>
  );
}
