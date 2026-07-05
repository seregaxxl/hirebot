"use client";

import { useState } from "react";

type Resume = { id: string; title: string; role: string };

export function ResumeList({ initial }: { initial: Resume[] }) {
  const [resumes, setResumes] = useState(initial);
  const [title, setTitle] = useState("");
  const [newRole, setNewRole] = useState("PM");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function add() {
    if (!title.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Ошибка");
      } else {
        setResumes((prev) => [...prev, data].sort((a, b) => a.title.localeCompare(b.title)));
        setTitle("");
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

  async function remove(id: string) {
    const res = await fetch(`/api/resumes/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Не удалось удалить");
      return;
    }
    setResumes((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="mb-1 font-semibold">Версии резюме</h2>
      <p className="mb-3 text-sm text-zinc-500">
        Заведи версии резюме под роли — по ним скоринг подбирает вакансии, а аналитика
        показывает, какая версия чаще доходит до приглашения.
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Название (например «Product Manager, финтех»)"
          className="min-w-56 flex-1 rounded border border-zinc-300 px-3 py-2 text-sm"
        />
        <select
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          className="rounded border border-zinc-300 px-2 py-2 text-sm"
        >
          <option value="PM">PM</option>
          <option value="PRODUCT">Product</option>
          <option value="CTO">CTO</option>
        </select>
        <button
          onClick={add}
          disabled={busy || !title.trim()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          Добавить
        </button>
      </div>

      {message && <p className="mb-2 text-sm text-red-600">{message}</p>}

      {resumes.length === 0 ? (
        <p className="text-sm text-zinc-500">Пока нет ни одной версии резюме — добавь первую выше.</p>
      ) : (
        <ul className="space-y-2">
          {resumes.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-2 text-sm">
              <span className="truncate">{r.title}</span>
              <div className="flex shrink-0 items-center gap-2">
                <select
                  value={r.role}
                  onChange={(e) => setRole(r.id, e.target.value)}
                  className="rounded border border-zinc-300 px-2 py-1"
                >
                  <option value="PM">PM</option>
                  <option value="PRODUCT">Product</option>
                  <option value="CTO">CTO</option>
                </select>
                <button
                  onClick={() => remove(r.id)}
                  className="rounded border border-zinc-300 px-2 py-1 text-red-600 hover:bg-red-50"
                >
                  Удалить
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
