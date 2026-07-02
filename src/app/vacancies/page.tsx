"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
type AutoState = {
  running: boolean;
  total: number;
  sent: number;
  skipped: number;
  failed: number;
  current: string | null;
  limitHit: boolean;
  log: string[];
};

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
  const [tab, setTab] = useState<"auto" | "manual">("auto");
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState("");

  // автоотклик
  const [minScore, setMinScore] = useState("40");
  const [limit, setLimit] = useState("200");
  const [useLLM, setUseLLM] = useState(true);
  const [auto, setAuto] = useState<AutoState | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // письмо-превью
  const [openId, setOpenId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  const loadVacancies = useCallback(async (mode: string) => {
    const res = await fetch(`/api/vacancies?mode=${mode}`);
    setVacancies(await res.json());
  }, []);

  const pollAuto = useCallback(async () => {
    const res = await fetch("/api/autoapply");
    const data: AutoState = await res.json();
    setAuto(data);
    return data.running;
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
    // если автоотклик уже крутится (после перезагрузки страницы) — подхватить
    pollAuto().then((running) => {
      if (running) startPolling();
    });
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startPolling() {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const running = await pollAuto();
      if (!running) {
        stopPolling();
        loadVacancies(tab);
      }
    }, 2000);
  }
  function stopPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }

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
        await loadVacancies(tab);
      }
    } finally {
      setSearchBusy(false);
    }
  }

  async function startAuto() {
    const res = await fetch("/api/autoapply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeId: selectedResume, minScore, limit, useLLM }),
    });
    const data = await res.json();
    if (!res.ok) setMessage(data.error ?? "Не удалось запустить");
    else {
      await pollAuto();
      startPolling();
    }
  }

  async function stopAuto() {
    await fetch("/api/autoapply", { method: "DELETE" });
  }

  async function makeLetter(id: string) {
    setOpenId(id);
    setPreview(null);
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

  async function apply(id: string) {
    if (!preview || !selectedResume) return;
    const res = await fetch(`/api/vacancies/${id}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resumeId: selectedResume,
        letter: preview.letter,
        letterSource: preview.source,
      }),
    });
    const data = await res.json();
    if (!res.ok) setMessage(data.error ?? "Ошибка отклика");
    else {
      setMessage("Отклик отправлен ✅");
      setOpenId(null);
      setPreview(null);
      await loadVacancies(tab);
    }
  }

  async function markApplied(id: string) {
    const res = await fetch(`/api/vacancies/${id}/mark-applied`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resumeId: selectedResume,
        letter: openId === id ? preview?.letter : undefined,
      }),
    });
    if (res.ok) {
      setMessage("Отмечено как отправленное ✅");
      setOpenId(null);
      setPreview(null);
      await loadVacancies(tab);
    }
  }

  async function act(id: string, action: "skip" | "blacklist") {
    await fetch(`/api/vacancies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await loadVacancies(tab);
  }

  const progress = auto && auto.total > 0 ? Math.round(((auto.sent + auto.skipped + auto.failed) / auto.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Вакансии</h1>

      {/* Поиск */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
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
          {resumes.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              Резюме:
              <select
                value={selectedResume}
                onChange={(e) => setSelectedResume(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1"
              >
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            </label>
          )}
          {message && <span className="text-sm text-zinc-500">{message}</span>}
        </div>
      </div>

      {/* Автоотклик */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">Массовый автоотклик</h2>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-1">
            скоринг ≥
            <input
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              className="w-16 rounded border border-zinc-300 px-2 py-1"
            />
          </label>
          <label className="flex items-center gap-1">
            максимум
            <input
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-16 rounded border border-zinc-300 px-2 py-1"
            />
            откликов
          </label>
          <label className="flex items-center gap-1">
            письма:
            <select
              value={useLLM ? "llm" : "tpl"}
              onChange={(e) => setUseLLM(e.target.value === "llm")}
              className="rounded border border-zinc-300 px-2 py-1"
            >
              <option value="llm">Claude (персональные, медленнее)</option>
              <option value="tpl">шаблон (быстро)</option>
            </select>
          </label>
          {!auto?.running ? (
            <button
              onClick={startAuto}
              disabled={!selectedResume}
              className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-500 disabled:opacity-40"
            >
              ▶ Запустить
            </button>
          ) : (
            <button onClick={stopAuto} className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-500">
              ⏹ Остановить
            </button>
          )}
        </div>

        {auto && (auto.running || auto.sent + auto.failed + auto.skipped > 0) && (
          <div className="mt-4 space-y-2">
            <div className="h-2 w-full overflow-hidden rounded bg-zinc-100">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-sm text-zinc-600">
              Отправлено <b className="text-green-700">{auto.sent}</b> · пропущено {auto.skipped} · ошибок{" "}
              {auto.failed} из {auto.total}
              {auto.limitHit && <span className="ml-2 font-medium text-red-600">— лимит hh исчерпан</span>}
              {auto.current && <span className="ml-2 text-zinc-400">сейчас: {auto.current}</span>}
            </div>
            {auto.log.length > 0 && (
              <pre className="max-h-40 overflow-y-auto rounded bg-zinc-50 p-2 text-xs text-zinc-600">
                {auto.log.slice(0, 50).join("\n")}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Вкладки */}
      <div className="flex gap-2 border-b border-zinc-200 text-sm">
        <button
          onClick={() => setTab("auto")}
          className={`px-4 py-2 ${tab === "auto" ? "border-b-2 border-zinc-900 font-semibold" : "text-zinc-500"}`}
        >
          Доступны для отклика
        </button>
        <button
          onClick={() => setTab("manual")}
          className={`px-4 py-2 ${tab === "manual" ? "border-b-2 border-zinc-900 font-semibold" : "text-zinc-500"}`}
        >
          Только вручную (тест)
        </button>
      </div>

      {tab === "manual" && vacancies.length > 0 && (
        <p className="text-sm text-zinc-500">
          Эти вакансии требуют пройти тест — hh не даёт откликнуться по API. Сгенерируй письмо, скопируй,
          перейди на hh по ссылке и откликнись сам, потом жми «Отметить отправленным».
        </p>
      )}

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
                </div>
                <div className="text-sm text-zinc-500">
                  {v.employerName} · {v.areaName ?? "—"} · {salaryText(v)}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-2 text-sm">
                <button
                  onClick={() => makeLetter(v.id)}
                  disabled={!selectedResume}
                  className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-500 disabled:opacity-40"
                >
                  Письмо
                </button>
                {tab === "manual" && (
                  <>
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
                      Отметить отправленным
                    </button>
                  </>
                )}
                <button onClick={() => act(v.id, "skip")} className="rounded border border-zinc-300 px-3 py-1 hover:bg-zinc-50">
                  Скрыть
                </button>
                <button onClick={() => act(v.id, "blacklist")} className="rounded border border-zinc-300 px-3 py-1 text-red-600 hover:bg-red-50">
                  В ЧС
                </button>
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
                        {tab === "auto" ? (
                          <button
                            onClick={() => apply(v.id)}
                            className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-500"
                          >
                            Отправить отклик
                          </button>
                        ) : (
                          <button
                            onClick={() => navigator.clipboard.writeText(preview.letter)}
                            className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-500"
                          >
                            Скопировать письмо
                          </button>
                        )}
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
            {tab === "auto" ? "Нет вакансий в очереди — запусти поиск выше." : "Нет вакансий с тестом."}
          </p>
        )}
      </div>
    </div>
  );
}
