import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getVacancy } from "@/lib/hh";
import {
  DEFAULT_TEMPLATE,
  checkLetter,
  generateLetterLLM,
  renderTemplate,
} from "@/lib/letters";

// Сгенерировать письмо (LLM или шаблон) + прогнать чеклист. Ничего не отправляет.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const full = await getVacancy(id); // полное описание + key_skills
    const resume = body.resumeId
      ? await prisma.resumeVersion.findUnique({ where: { id: body.resumeId } })
      : await prisma.resumeVersion.findFirst();

    let letter: string | null = null;
    let source = "TEMPLATE";

    if (body.templateId) {
      const tpl = await prisma.coverLetterTemplate.findUnique({
        where: { id: Number(body.templateId) },
      });
      if (tpl) {
        letter = renderTemplate(tpl.body, {
          position: full.name,
          company: full.employer?.name ?? "",
        });
        source = `TEMPLATE:${tpl.name}`;
      }
    } else {
      letter = await generateLetterLLM(full, resume?.title ?? "Руководитель проектов", body.styleHint);
      if (letter) source = "LLM";
    }

    if (!letter) {
      letter = renderTemplate(DEFAULT_TEMPLATE, {
        position: full.name,
        company: full.employer?.name ?? "",
      });
      source = "TEMPLATE:default";
    }

    return NextResponse.json({
      letter,
      source,
      checklist: checkLetter(letter, full),
      hasTest: Boolean(full.has_test),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
