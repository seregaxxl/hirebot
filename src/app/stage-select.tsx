"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STAGES: [string, string][] = [
  ["SENT", "Отправлен"],
  ["VIEWED", "Просмотрен"],
  ["INVITED", "Приглашение"],
  ["DISCARDED", "Отказ hh"],
  ["SCREENING", "Скрининг"],
  ["INTERVIEW", "Собеседование"],
  ["FINAL", "Финал"],
  ["OFFER", "Оффер"],
  ["REJECTED", "Отказ"],
];

export function StageSelect({ id, status }: { id: number; status: string }) {
  const [value, setValue] = useState(status);
  const router = useRouter();

  async function change(next: string) {
    setValue(next);
    await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    router.refresh();
  }

  return (
    <select
      value={value}
      onChange={(e) => change(e.target.value)}
      className="rounded border border-zinc-200 bg-white px-1 py-0.5 text-sm"
    >
      {STAGES.map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}
