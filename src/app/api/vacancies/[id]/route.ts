import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Ручные действия над вакансией: скрыть, в чёрный список
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  if (body.action === "skip") {
    const v = await prisma.vacancy.update({ where: { id }, data: { status: "SKIPPED" } });
    return NextResponse.json(v);
  }
  if (body.action === "blacklist") {
    const v = await prisma.vacancy.findUnique({ where: { id } });
    if (v?.employerId) {
      await prisma.blacklistedEmployer.upsert({
        where: { id: v.employerId },
        create: { id: v.employerId, name: v.employerName },
        update: {},
      });
      await prisma.vacancy.updateMany({
        where: { employerId: v.employerId, status: "NEW" },
        data: { status: "SKIPPED" },
      });
    }
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "action: skip | blacklist" }, { status: 400 });
}
