import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const KEY = "plan_checked";

export const dynamic = "force-dynamic";

export async function GET() {
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  const checked = row ? (JSON.parse(row.value) as string[]) : [];
  return NextResponse.json({ checked });
}

// Полное сохранение набора отмеченных пунктов.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const checked = Array.isArray(body.checked)
    ? [...new Set(body.checked.filter((x: unknown) => typeof x === "string"))]
    : [];
  const value = JSON.stringify(checked);
  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value },
    update: { value },
  });
  return NextResponse.json({ ok: true, checked });
}
