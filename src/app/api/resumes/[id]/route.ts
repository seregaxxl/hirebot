import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { role } = await req.json();
  if (!["PM", "PRODUCT", "CTO"].includes(role)) {
    return NextResponse.json({ error: "role: PM | PRODUCT | CTO" }, { status: 400 });
  }
  const resume = await prisma.resumeVersion.update({ where: { id }, data: { role } });
  return NextResponse.json(resume);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const used = await prisma.application.count({ where: { resumeId: id } });
  if (used > 0) {
    return NextResponse.json(
      { error: `Нельзя удалить: на это резюме завязано откликов — ${used}` },
      { status: 409 }
    );
  }
  await prisma.resumeVersion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
