import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getNegotiations } from "@/lib/hh";

// Подтянуть статусы откликов с hh.ru: просмотрен / приглашение / отказ
export async function POST() {
  try {
    let page = 0;
    let pages = 1;
    let updated = 0;

    while (page < pages && page < 10) {
      const data = await getNegotiations(page);
      pages = data.pages;

      for (const n of data.items) {
        const app = await prisma.application.findFirst({
          where: {
            OR: [
              { negotiationId: n.id },
              n.vacancy?.id ? { vacancyId: n.vacancy.id } : { negotiationId: n.id },
            ],
          },
        });
        if (!app) continue;

        // hh-статусы двигают только раннюю часть воронки; ручные стадии не трогаем
        const manualStages = ["SCREENING", "INTERVIEW", "FINAL", "OFFER", "REJECTED"];
        if (manualStages.includes(app.status)) continue;

        let newStatus = app.status;
        if (n.state.id === "invitation") newStatus = "INVITED";
        else if (n.state.id === "discard") newStatus = "DISCARDED";
        else if (n.viewed_by_opponent && app.status === "SENT") newStatus = "VIEWED";

        const viewed = Boolean(n.viewed_by_opponent) || app.viewedByEmployer;
        if (newStatus !== app.status || viewed !== app.viewedByEmployer) {
          await prisma.application.update({
            where: { id: app.id },
            data: {
              status: newStatus,
              viewedByEmployer: viewed,
              negotiationId: app.negotiationId ?? n.id,
              ...(newStatus !== app.status
                ? { events: { create: { status: newStatus, source: "SYNC" } } }
                : {}),
            },
          });
          updated++;
        }
      }
      page++;
    }
    return NextResponse.json({ updated });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
