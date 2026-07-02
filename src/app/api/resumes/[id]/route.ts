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
