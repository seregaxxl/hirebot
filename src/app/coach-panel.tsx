"use client";

import { useState } from "react";

function fmtDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CoachPanel({
  initialAdvice,
  initialAt,
}: {
  initialAdvice: string | null;
  initialAt: string | null;
}) {
  const [advice, setAdvice] = useState(initialAdvice);
  const [at, setAt] = useState(initialAt ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/coach", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Не удалось получить совет");
        return;
      }
      setAdvice(data.advice);
      setAt(data.at ?? "");
    } catch {
      setError("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">🧭 Совет от Claude</h2>
          {at && !busy && (
            <p className="text-xs text-zinc-400">обновлено {fmtDate(at)}</p>
          )}
        </div>
        <button
          onClick={generate}
          disabled={busy}
          className="shrink-0 rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {busy ? "Анализирую воронку…" : advice ? "Обновить совет" : "Получить совет"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {busy && (
        <p className="mt-3 text-sm text-zinc-500">
          Claude читает твою статистику и готовит разбор — это может занять до пары минут.
        </p>
      )}

      {!busy && advice && (
        <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
          {advice}
        </div>
      )}

      {!busy && !advice && !error && (
        <p className="mt-3 text-sm text-zinc-500">
          Нажми «Получить совет» — Claude разберёт твою воронку и подскажет, что делать дальше.
        </p>
      )}
    </div>
  );
}
