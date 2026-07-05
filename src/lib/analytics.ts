import type { Application, Vacancy, ResumeVersion } from "@prisma/client";

export type AppWithRelations = Application & {
  vacancy: Vacancy;
  resume: ResumeVersion;
};

// Статусы «получен отклик работодателя» (дошли дальше отправки)
export const INVITED_PLUS = ["INVITED", "SCREENING", "INTERVIEW", "FINAL", "OFFER"];
const INTERVIEW_PLUS = ["INTERVIEW", "FINAL", "OFFER"];

function isViewed(a: AppWithRelations) {
  return a.viewedByEmployer || a.status !== "SENT";
}
function isInvited(a: AppWithRelations) {
  return INVITED_PLUS.includes(a.status);
}

export type Breakdown = { key: string; total: number; invited: number; rate: number };

function breakdown(
  apps: AppWithRelations[],
  keyOf: (a: AppWithRelations) => string
): Breakdown[] {
  const map = new Map<string, { total: number; invited: number }>();
  for (const a of apps) {
    const k = keyOf(a);
    const s = map.get(k) ?? { total: 0, invited: 0 };
    s.total++;
    if (isInvited(a)) s.invited++;
    map.set(k, s);
  }
  return [...map.entries()]
    .map(([key, s]) => ({
      key,
      total: s.total,
      invited: s.invited,
      rate: s.total ? Math.round((s.invited / s.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export type Stats = {
  total: number;
  funnel: { label: string; value: number; conv: number | null }[];
  byRole: Breakdown[];
  byResume: Breakdown[];
  bySource: Breakdown[];
  appliedLast7d: number;
  appliedLast30d: number;
  // «завис»: отправлен > 10 дней назад, работодатель не смотрел
  stale: number;
  rejected: number;
  // средний скоринг вакансий, куда позвали vs куда нет
  avgScoreInvited: number | null;
  avgScoreOther: number | null;
};

function avgScore(apps: AppWithRelations[]): number | null {
  const scores = apps.map((a) => a.vacancy.score).filter((s): s is number => s != null);
  if (!scores.length) return null;
  return Math.round(scores.reduce((x, y) => x + y, 0) / scores.length);
}

export function computeStats(apps: AppWithRelations[]): Stats {
  const total = apps.length;
  const conv = (part: number) => (total ? Math.round((part / total) * 100) : null);

  const viewed = apps.filter(isViewed).length;
  const invited = apps.filter(isInvited).length;
  const interviews = apps.filter((a) => INTERVIEW_PLUS.includes(a.status)).length;
  const offers = apps.filter((a) => a.status === "OFFER").length;

  const now = Date.now();
  const days = (ms: number) => (now - ms) / 86_400_000;
  const appliedLast7d = apps.filter((a) => days(a.sentAt.getTime()) <= 7).length;
  const appliedLast30d = apps.filter((a) => days(a.sentAt.getTime()) <= 30).length;
  const stale = apps.filter(
    (a) => a.status === "SENT" && !a.viewedByEmployer && days(a.sentAt.getTime()) > 10
  ).length;
  const rejected = apps.filter((a) => ["REJECTED", "DISCARDED"].includes(a.status)).length;

  const invitedApps = apps.filter(isInvited);
  const otherApps = apps.filter((a) => !isInvited(a));

  return {
    total,
    funnel: [
      { label: "Откликов", value: total, conv: null },
      { label: "Просмотрено", value: viewed, conv: conv(viewed) },
      { label: "Приглашений", value: invited, conv: conv(invited) },
      { label: "Собеседований", value: interviews, conv: conv(interviews) },
      { label: "Офферов", value: offers, conv: conv(offers) },
    ],
    byRole: breakdown(apps, (a) => a.resume.role),
    byResume: breakdown(apps, (a) => a.resume.title),
    bySource: breakdown(apps, (a) =>
      a.letterSource.startsWith("TEMPLATE") ? "шаблон" : "LLM"
    ),
    appliedLast7d,
    appliedLast30d,
    stale,
    rejected,
    avgScoreInvited: avgScore(invitedApps),
    avgScoreOther: avgScore(otherApps),
  };
}
