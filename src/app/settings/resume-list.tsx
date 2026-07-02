"use client";

import { useState } from "react";

type Resume = { id: string; title: string; role: string };

export function ResumeList({ initial }: { initial: Resume[] }) {
  const [resumes, setResumes] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function sync() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/resumes", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Ошибка");
      } else {
        setMessage(`Синхронизировано резюме: ${data.synced}`);
        const list = await fetch("/api/resumes").then((r) => r.json());
        setResumes(list);
      }
    } finally {
      setBusy(false);
    }
  }

  async function setRole(id: string, role: string) {
    setResumes((prev) => prev.map((r) => (r.id === id ? { ...r, role } : r)));
    await fetch(`/api/resumes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Резюме с hh.ru</h2>
        <button
          onClick={sync}
          disabled={busy}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {busy ? "Синхронизирую…" : "Синхронизировать резюме"}
        </button>
      </div>
      {message && <p className="mb-2 text-sm text-zinc-500">{message}</p>}
      {resumes.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Резюме пока не подтянуты. Подключи hh.ru и нажми «Синхронизировать».
        </p>
      ) : (
        <ul className="space-y-2">
          {resumes.map((r) => (
            <li key={r.id} className="flex items-center justify-between border-b border-zinc-100 pb-2 text-sm">
              <span>{r.title}</span>
              <select
                value={r.role}
                onChange={(e) => setRole(r.id, e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1"
              >
                <option value="PM">PM</option>
                <option value="PRODUCT">Product</option>
                <option value="CTO">CTO</option>
              </select>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
