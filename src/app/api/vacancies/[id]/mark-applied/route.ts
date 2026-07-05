import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Занести в журнал: «откликнулся вручную на hh.ru».
// letterSource: "LLM" | "TEMPLATE:<name>" | "MANUAL" — нужен для A/B-аналитики.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  if (!body.resumeId) {
    return NextResponse.json({ error: "нужен resumeId" }, { status: 400 });
  }
  const existing = await prisma.application.findUnique({ where: { vacancyId: id } });
  if (existing) {
    return NextResponse.json({ error: "Уже отмечено" }, { status: 409 });
  }

  const app = await prisma.application.create({
    data: {
      vacancyId: id,
      resumeId: body.resumeId,
      letter: body.letter ?? "(ручной отклик на hh.ru)",
      letterSource: body.letterSource ?? (body.letter ? "LLM" : "MANUAL"),
      status: "SENT",
      events: { create: { status: "SENT", source: "MANUAL" } },
    },
  });
  await prisma.vacancy.update({ where: { id }, data: { status: "APPLIED" } });
  return NextResponse.json(app);
}
