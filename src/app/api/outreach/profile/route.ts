import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const KEY = "outreach_profile";

export const dynamic = "force-dynamic";

// Кейсы кандидата — общий контекст для генерации всех аутрич-писем.
export async function GET() {
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  return NextResponse.json({ cases: row?.value ?? "" });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const cases = String(body.cases ?? "");
  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: cases },
    update: { value: cases },
  });
  return NextResponse.json({ ok: true });
}
