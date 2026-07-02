import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requestStop, startAutoApply, state } from "@/lib/autoapply";

export async function GET() {
  return NextResponse.json(state);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const resume = body.resumeId
    ? await prisma.resumeVersion.findUnique({ where: { id: body.resumeId } })
    : null;
  if (!resume) {
    return NextResponse.json({ error: "Выбери резюме" }, { status: 400 });
  }
  const started = startAutoApply({
    resumeId: resume.id,
    resumeTitle: resume.title,
    minScore: Number(body.minScore ?? 40),
    limit: Number(body.limit ?? 200),
    useLLM: body.useLLM !== false,
  });
  if (!started) {
    return NextResponse.json({ error: "Автоотклик уже запущен" }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  requestStop();
  return NextResponse.json({ ok: true });
}
