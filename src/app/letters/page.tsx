"use client";

import { useEffect, useState } from "react";

type Template = { id: number; name: string; body: string; active: boolean };

export default function LettersPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");

  async function load() {
    const res = await fetch("/api/templates");
    setTemplates(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!name || !body) return;
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, body }),
    });
    setName("");
    setBody("");
    await load();
  }

  async function remove(id: number) {
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Шаблоны писем</h1>
      <p className="text-sm text-zinc-500">
        Плейсхолдеры: <code>{"{position}"}</code> — название вакансии, <code>{"{company}"}</code> — компания.
        Если задан ANTHROPIC_API_KEY, письма по умолчанию генерируются персонально под вакансию,
        а шаблоны — запасной вариант и материал для A/B-теста.
      </p>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название шаблона (например «короткое с кейсом»)"
          className="mb-2 w-full rounded border border-zinc-300 px-3 py-2"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={"Здравствуйте! Меня заинтересовала вакансия «{position}» в {company}…"}
          rows={6}
          className="mb-2 w-full rounded border border-zinc-300 px-3 py-2"
        />
        <button onClick={add} className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700">
          Добавить шаблон
        </button>
      </div>

      <div className="space-y-3">
        {templates.map((t) => (
          <div key={t.id} className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{t.name}</h2>
              <button onClick={() => remove(t.id)} className="text-sm text-red-600 hover:underline">
                Удалить
              </button>
            </div>
            <pre className="mt-2 whitespace-pre-wrap text-sm text-zinc-600">{t.body}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
