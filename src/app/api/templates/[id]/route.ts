import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const tpl = await prisma.coverLetterTemplate.update({
    where: { id: Number(id) },
    data: {
      ...(body.name ? { name: body.name } : {}),
      ...(body.body ? { body: body.body } : {}),
      ...(typeof body.active === "boolean" ? { active: body.active } : {}),
    },
  });
  return NextResponse.json(tpl);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.coverLetterTemplate.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
