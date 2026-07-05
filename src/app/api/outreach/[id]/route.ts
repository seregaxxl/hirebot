import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { OUTREACH_STAGES } from "@/lib/outreach";

const STAGE_IDS = OUTREACH_STAGES.map(([id]) => id);
const EDITABLE = ["company", "contactName", "contactRole", "contactLink", "domain", "channel", "notes", "letter"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const data: Record<string, string | null> = {};
  if (body.stage !== undefined) {
    if (!STAGE_IDS.includes(body.stage)) {
      return NextResponse.json({ error: "неизвестный этап" }, { status: 400 });
    }
    data.stage = body.stage;
  }
  for (const key of EDITABLE) {
    if (body[key] !== undefined) {
      const v = typeof body[key] === "string" ? body[key].trim() : body[key];
      data[key] = v || null;
    }
  }

  const item = await prisma.outreach.update({ where: { id: Number(id) }, data });
  return NextResponse.json(item);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.outreach.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
