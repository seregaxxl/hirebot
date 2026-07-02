import type { HhVacancy } from "./hh";

export type Role = "PM" | "PRODUCT" | "CTO";

const ROLE_KEYWORDS: Record<Role, string[]> = {
  PM: [
    "проджект",
    "project manager",
    "менеджер проектов",
    "менеджер проекта",
    "руководитель проектов",
    "руководитель проекта",
    "delivery manager",
    "program manager",
  ],
  PRODUCT: [
    "продакт",
    "product manager",
    "менеджер продукта",
    "менеджер по продукту",
    "product owner",
    "владелец продукта",
    "head of product",
    "cpo",
  ],
  CTO: [
    "cto",
    "технический директор",
    "техдир",
    "head of engineering",
    "vp of engineering",
    "директор по разработке",
    "руководитель разработки",
  ],
};

const NEGATIVE_TITLE = ["стажер", "стажёр", "junior", "джуниор", "ассистент", "помощник"];
const AGENCY_MARKERS = ["кадровое агентство", "recruitment", "рекрутинговое", "hr-агентство", "staffing"];

export type ScoreDetail = { label: string; points: number };

export function scoreVacancy(
  v: HhVacancy,
  role: Role,
  opts: { blacklistedEmployerIds?: Set<string>; minSalary?: number } = {}
): { score: number; details: ScoreDetail[] } {
  const details: ScoreDetail[] = [];
  const title = v.name.toLowerCase();
  const text = [
    v.snippet?.requirement ?? "",
    v.snippet?.responsibility ?? "",
    v.description ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (opts.blacklistedEmployerIds?.has(v.employer?.id ?? "")) {
    return { score: 0, details: [{ label: "Работодатель в чёрном списке", points: 0 }] };
  }

  // Совпадение роли в названии — главный сигнал
  const keywords = ROLE_KEYWORDS[role];
  if (keywords.some((k) => title.includes(k))) {
    details.push({ label: "Роль в названии вакансии", points: 40 });
  } else if (keywords.some((k) => text.includes(k))) {
    details.push({ label: "Роль упомянута в описании", points: 15 });
  }

  if (NEGATIVE_TITLE.some((k) => title.includes(k))) {
    details.push({ label: "Джун/стажёр в названии", points: -30 });
  }

  // Зарплата
  const salaryTo = v.salary?.to ?? v.salary?.from ?? null;
  if (salaryTo) {
    details.push({ label: "Указана зарплата", points: 10 });
    if (opts.minSalary && salaryTo >= opts.minSalary) {
      details.push({ label: "Зарплата не ниже порога", points: 10 });
    }
  }

  // Не агентство
  const employer = (v.employer?.name ?? "").toLowerCase();
  if (AGENCY_MARKERS.some((k) => employer.includes(k))) {
    details.push({ label: "Похоже на кадровое агентство", points: -20 });
  }

  // Свежесть — свежие вакансии дают лучшую конверсию отклика
  if (v.published_at) {
    const ageDays = (Date.now() - new Date(v.published_at).getTime()) / 86_400_000;
    if (ageDays <= 3) details.push({ label: "Опубликована ≤3 дней назад", points: 15 });
    else if (ageDays <= 7) details.push({ label: "Опубликована ≤7 дней назад", points: 8 });
  }

  // Тест — по API не откликнуться, тратим слот вручную только если очень надо
  if (v.has_test) {
    details.push({ label: "Требуется тест (только ручной отклик)", points: -10 });
  } else {
    details.push({ label: "Без обязательного теста", points: 5 });
  }

  const raw = details.reduce((sum, d) => sum + d.points, 0);
  return { score: Math.max(0, Math.min(100, raw + 20)), details };
}
