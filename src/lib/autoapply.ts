import { prisma } from "./db";
import { HhApiError, applyToVacancy, getVacancy } from "./hh";
import { DEFAULT_TEMPLATE, generateLetterLLM, renderTemplate } from "./letters";

export type AutoApplyState = {
  running: boolean;
  stopRequested: boolean;
  startedAt: number | null;
  total: number;
  sent: number;
  skipped: number;
  failed: number;
  current: string | null;
  limitHit: boolean;
  log: string[];
};

const initial = (): AutoApplyState => ({
  running: false,
  stopRequested: false,
  startedAt: null,
  total: 0,
  sent: 0,
  skipped: 0,
  failed: 0,
  current: null,
  limitHit: false,
  log: [],
});

// переживает hot-reload dev-сервера
const g = globalThis as unknown as { autoApplyState?: AutoApplyState };
export const state: AutoApplyState = g.autoApplyState ?? (g.autoApplyState = initial());

function log(msg: string) {
  state.log.unshift(`${new Date().toLocaleTimeString("ru-RU")} ${msg}`);
  if (state.log.length > 300) state.log.pop();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function requestStop() {
  if (state.running) state.stopRequested = true;
}

export function startAutoApply(opts: {
  resumeId: string;
  resumeTitle: string;
  minScore: number;
  limit: number;
  useLLM: boolean;
}): boolean {
  if (state.running) return false;
  Object.assign(state, initial(), { running: true, startedAt: Date.now() });
  // не await — крутится в фоне, статус опрашивается по /api/autoapply
  void run(opts);
  return true;
}

async function run(opts: {
  resumeId: string;
  resumeTitle: string;
  minScore: number;
  limit: number;
  useLLM: boolean;
}) {
  try {
    const vacancies = await prisma.vacancy.findMany({
      where: {
        status: "NEW",
        hasTest: false,
        score: { gte: opts.minScore },
        application: null,
      },
      orderBy: { score: "desc" },
      take: Math.min(opts.limit, 200),
    });
    state.total = vacancies.length;
    log(`Старт: ${vacancies.length} вакансий, скоринг ≥ ${opts.minScore}, письма: ${opts.useLLM ? "Claude" : "шаблон"}`);

    for (const v of vacancies) {
      if (state.stopRequested) {
        log("Остановлено вручную");
        break;
      }
      state.current = `${v.name} — ${v.employerName}`;

      try {
        let letter: string | null = null;
        let source = "TEMPLATE:default";

        if (opts.useLLM) {
          const full = await getVacancy(v.id);
          letter = await generateLetterLLM(full, opts.resumeTitle);
          if (letter) source = "LLM";
          else log(`⚠ ${v.name}: Claude недоступен, беру шаблон`);
        }
        if (!letter) {
          letter = renderTemplate(DEFAULT_TEMPLATE, {
            position: v.name,
            company: v.employerName,
          });
        }

        const negotiationId = await applyToVacancy(v.id, opts.resumeId, letter);
        await prisma.application.create({
          data: {
            vacancyId: v.id,
            resumeId: opts.resumeId,
            negotiationId,
            letter,
            letterSource: source,
            status: "SENT",
            events: { create: { status: "SENT", source: "MANUAL" } },
          },
        });
        await prisma.vacancy.update({ where: { id: v.id }, data: { status: "APPLIED" } });
        state.sent++;
        log(`✓ ${v.name} (${v.employerName})`);
      } catch (e) {
        if (e instanceof HhApiError && e.status === 403) {
          if (e.body.includes("limit_exceeded")) {
            state.limitHit = true;
            log("⛔ Дневной лимит hh (200 откликов) исчерпан — стоп");
            break;
          }
          if (e.body.includes("test_required")) {
            await prisma.vacancy.update({
              where: { id: v.id },
              data: { status: "MANUAL_REQUIRED" },
            });
            state.skipped++;
            log(`→ ${v.name}: требуется тест, перенесена в «вручную»`);
            continue;
          }
          if (e.body.includes("already_applied")) {
            await prisma.vacancy.update({ where: { id: v.id }, data: { status: "APPLIED" } });
            state.skipped++;
            log(`→ ${v.name}: отклик уже был`);
            continue;
          }
        }
        state.failed++;
        log(`✗ ${v.name}: ${String(e).slice(0, 200)}`);
      }

      // пауза между откликами, чтобы не долбить API
      await sleep(1500 + Math.floor(Math.random() * 1500));
    }
  } catch (e) {
    log(`Фатальная ошибка: ${String(e).slice(0, 300)}`);
  } finally {
    state.running = false;
    state.current = null;
    log(`Готово: отправлено ${state.sent}, пропущено ${state.skipped}, ошибок ${state.failed}`);
  }
}
