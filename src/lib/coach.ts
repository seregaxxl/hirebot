import { prisma } from "./db";
import { runClaude } from "./claude";
import { computeStats, type AppWithRelations, type Breakdown } from "./analytics";

function fmtBreakdown(title: string, rows: Breakdown[]): string {
  if (rows.length === 0) return `${title}: нет данных`;
  const lines = rows.map((r) => `  • ${r.key}: ${r.invited}/${r.total} → ${r.rate}%`);
  return `${title}:\n${lines.join("\n")}`;
}

const COACH_RULES = `Ты — персональный коуч по трудоустройству. Кандидат ищет работу уровня PM / Product / CTO и ведёт локальный журнал откликов. Ниже — сводка его воронки.

Дай разбор на русском языке, деловым живым тоном, без воды и канцелярита. Структура ответа:
1. Что говорят цифры — 2–3 наблюдения по воронке (где теряются кандидаты: мало откликов / не смотрят / смотрят, но не зовут / зовут, но нет оффера).
2. Что улучшить — 3–4 конкретных приоритизированных совета под слабое место воронки. Ссылайся на цифры из сводки.
3. План на сегодня — короткий чеклист из 3–5 пунктов, что сделать прямо сейчас.

Правила:
- Опирайся ТОЛЬКО на данные из сводки, не выдумывай цифры.
- Если данных мало (мало откликов), сфокусируйся на том, как раскачать воронку и начать копить статистику.
- Диагностируй по конверсиям: низкий «просмотрено» → проблема в резюме/подаче; смотрят, но не зовут → сопроводительные/релевантность; зовут, но нет оффера → подготовка к собесам.
- Верни обычный текст с короткими заголовками и маркерами «•». Без markdown-разметки, без блоков кода.`;

export function buildCoachPrompt(apps: AppWithRelations[]): string {
  const s = computeStats(apps);

  const funnel = s.funnel
    .map((f) => `  • ${f.label}: ${f.value}${f.conv != null ? ` (${f.conv}% от откликов)` : ""}`)
    .join("\n");

  const scoreLine =
    s.avgScoreInvited != null && s.avgScoreOther != null
      ? `Средний скоринг вакансий: куда позвали — ${s.avgScoreInvited}, куда нет — ${s.avgScoreOther}`
      : "Средний скоринг: недостаточно данных";

  return `${COACH_RULES}

=== СВОДКА ВОРОНКИ ===
Всего откликов: ${s.total}
Откликов за 7 дней: ${s.appliedLast7d}, за 30 дней: ${s.appliedLast30d}
Отказов: ${s.rejected}
Зависших (отправлен >10 дней назад, не просмотрен): ${s.stale}

Воронка:
${funnel}

${fmtBreakdown("Конверсия по роли (резюме)", s.byRole)}

${fmtBreakdown("Конверсия по версии резюме", s.byResume)}

${fmtBreakdown("Конверсия по типу письма", s.bySource)}

${scoreLine}
=== КОНЕЦ СВОДКИ ===`;
}

const CACHE_KEY = "coach_advice";
const CACHE_AT_KEY = "coach_advice_at";

export async function getCachedAdvice(): Promise<{ advice: string; at: string } | null> {
  const [advice, at] = await Promise.all([
    prisma.setting.findUnique({ where: { key: CACHE_KEY } }),
    prisma.setting.findUnique({ where: { key: CACHE_AT_KEY } }),
  ]);
  if (!advice) return null;
  return { advice: advice.value, at: at?.value ?? "" };
}

async function saveAdvice(advice: string) {
  const at = new Date().toISOString();
  for (const [key, value] of [
    [CACHE_KEY, advice],
    [CACHE_AT_KEY, at],
  ] as const) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
  return at;
}

// Сгенерировать свежий совет и закешировать. null — если Claude CLI недоступен.
export async function generateAdvice(): Promise<{ advice: string; at: string } | null> {
  const apps = await prisma.application.findMany({
    include: { vacancy: true, resume: true },
  });
  const prompt = buildCoachPrompt(apps);
  const advice = await runClaude(prompt, { minLength: 40 });
  if (!advice) return null;
  const at = await saveAdvice(advice);
  return { advice, at };
}
