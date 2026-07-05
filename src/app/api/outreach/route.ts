import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await prisma.outreach.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const company = String(body.company ?? "").trim();
  if (!company) {
    return NextResponse.json({ error: "нужно название компании" }, { status: 400 });
  }
  const item = await prisma.outreach.create({
    data: {
      company,
      contactName: body.contactName?.trim() || null,
      contactRole: body.contactRole?.trim() || null,
      contactLink: body.contactLink?.trim() || null,
      domain: body.domain?.trim() || null,
      channel: body.channel?.trim() || null,
    },
  });
  return NextResponse.json(item);
}
