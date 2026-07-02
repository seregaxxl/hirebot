import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HhApiError, applyToVacancy } from "@/lib/hh";

// Отправить отклик на hh.ru с готовым письмом
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { resumeId, letter, letterSource } = await req.json();

  if (!resumeId || !letter) {
    return NextResponse.json({ error: "нужны resumeId и letter" }, { status: 400 });
  }

  const existing = await prisma.application.findUnique({ where: { vacancyId: id } });
  if (existing) {
    return NextResponse.json({ error: "Отклик на эту вакансию уже отправлен" }, { status: 409 });
  }

  try {
    const negotiationId = await applyToVacancy(id, resumeId, letter);
    const application = await prisma.application.create({
      data: {
        vacancyId: id,
        resumeId,
        negotiationId,
        letter,
        letterSource: letterSource ?? "TEMPLATE",
        status: "SENT",
        events: { create: { status: "SENT", source: "MANUAL" } },
      },
    });
    await prisma.vacancy.update({ where: { id }, data: { status: "APPLIED" } });
    return NextResponse.json(application);
  } catch (e) {
    if (e instanceof HhApiError && e.status === 403) {
      // типовые причины: лимит 200/день, требуется тест, уже откликался
      if (e.body.includes("test_required")) {
        await prisma.vacancy.update({ where: { id }, data: { status: "MANUAL_REQUIRED" } });
        return NextResponse.json(
          { error: "Вакансия требует пройти тест — откликнись вручную на hh.ru" },
          { status: 403 }
        );
      }
      if (e.body.includes("limit_exceeded")) {
        return NextResponse.json(
          { error: "Достигнут дневной лимит откликов hh.ru (200/сутки)" },
          { status: 403 }
        );
      }
    }
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
