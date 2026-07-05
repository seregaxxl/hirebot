import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runClaude } from "@/lib/claude";
import { buildOutreachPrompt } from "@/lib/outreach";

export const dynamic = "force-dynamic";
export const maxDuration = 200;

// Сгенерировать холодное письмо под эту компанию/контакт (через claude -p) и сохранить в запись.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const lang = body.lang === "ru" ? "ru" : "en";

  const item = await prisma.outreach.findUnique({ where: { id: Number(id) } });
  if (!item) return NextResponse.json({ error: "не найдено" }, { status: 404 });

  const cases =
    typeof body.cases === "string" && body.cases.trim()
      ? body.cases
      : (await prisma.setting.findUnique({ where: { key: "outreach_profile" } }))?.value ?? "";

  const prompt = buildOutreachPrompt(
    {
      company: item.company,
      contactName: item.contactName,
      contactRole: item.contactRole,
      domain: item.domain,
    },
    cases,
    lang
  );

  const letter = await runClaude(prompt, { minLength: 80 });
  if (!letter) {
    return NextResponse.json(
      { error: "Claude CLI недоступен — проверь, что команда `claude` работает и выполнен вход." },
      { status: 503 }
    );
  }

  const updated = await prisma.outreach.update({
    where: { id: Number(id) },
    data: { letter },
  });
  return NextResponse.json({ letter: updated.letter });
}
